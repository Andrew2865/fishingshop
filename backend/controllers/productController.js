import pool from '../config/db.js';


function normalizeOptionalString(value) {
  if (value === undefined) return undefined;
  const trimmed = String(value || '').trim();
  return trimmed === '' ? null : trimmed;
}

function normalizeNumber(value, fieldName, { integer = false, allowNull = true, min = 0 } = {}) {
  if (value === undefined) return { ok: true, value: undefined };
  if (value === null || value === '') return allowNull ? { ok: true, value: null } : { ok: false, error: `Pole ${fieldName} jest wymagane.` };

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return { ok: false, error: `Pole ${fieldName} musi być liczbą.` };
  if (integer && !Number.isInteger(parsed)) return { ok: false, error: `Pole ${fieldName} musi być liczbą całkowitą.` };
  if (parsed < min) return { ok: false, error: `Pole ${fieldName} nie może być mniejsze niż ${min}.` };
  return { ok: true, value: parsed };
}

function normalizeBoolean(value) {
  if (value === undefined) return undefined;
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    const lowered = value.toLowerCase();
    if (['true', '1', 'on'].includes(lowered)) return true;
    if (['false', '0', 'off'].includes(lowered)) return false;
  }
  return Boolean(value);
}

async function ensureCategoryExists(categoryId) {
  if (categoryId === null || categoryId === undefined) return true;
  const result = await pool.query('SELECT id FROM categories WHERE id=$1', [categoryId]);
  return result.rows.length > 0;
}

function validateProductPayload(payload) {
  if (!payload.name || !String(payload.name).trim()) {
    return 'Nazwa produktu jest wymagana.';
  }
  if (payload.price === null || payload.price === undefined || Number(payload.price) < 0) {
    return 'Cena produktu musi być liczbą większą lub równą 0.';
  }
  if (payload.stock === null || payload.stock === undefined || Number(payload.stock) < 0) {
    return 'Stan magazynowy musi być liczbą większą lub równą 0.';
  }
  if (payload.old_price !== null && payload.old_price !== undefined && Number(payload.old_price) < Number(payload.price)) {
    return 'Stara cena nie może być niższa niż aktualna cena.';
  }
  return null;
}

async function getProductGallery(productId, fallbackImage) {
  const galleryRes = await pool.query(
    'SELECT id, image_url, sort_order, created_at FROM product_images WHERE product_id=$1 ORDER BY sort_order ASC, id ASC',
    [productId]
  );
  const gallery = [];
  if (fallbackImage) {
    gallery.push({ id: `main-${productId}`, image_url: fallbackImage, is_main: true });
  }
  galleryRes.rows.forEach((row) => {
    if (!gallery.some((img) => img.image_url === row.image_url)) {
      gallery.push({ ...row, is_main: false });
    }
  });
  return gallery;
}

async function getProductReviewsPayload(productId) {
  const [summaryRes, reviewsRes] = await Promise.all([
    pool.query(
      `SELECT COALESCE(ROUND(AVG(rating)::numeric, 1), 0) AS avg_rating, COUNT(*)::int AS review_count
       FROM product_reviews
       WHERE product_id=$1`,
      [productId]
    ),
    pool.query(
      `SELECT pr.id, pr.product_id, pr.user_id, pr.rating, pr.comment, pr.created_at, pr.updated_at, u.name AS user_name
       FROM product_reviews pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.product_id=$1
       ORDER BY pr.updated_at DESC, pr.id DESC`,
      [productId]
    ),
  ]);

  return {
    avg_rating: Number(summaryRes.rows[0]?.avg_rating || 0),
    review_count: Number(summaryRes.rows[0]?.review_count || 0),
    items: reviewsRes.rows,
  };
}

export const getProducts = async (req, res) => {
  try {
    const { category_id, category, q, sort, page, page_size, limit } = req.query;

    const params = [];
    const where = ['is_active = true'];
    const normalizedCategoryId = category_id ?? category;

    if (normalizedCategoryId) {
      params.push(Number(normalizedCategoryId));
      where.push(`category_id = $${params.length}`);
    }

    if (q) {
      params.push(`%${String(q).toLowerCase()}%`);
      where.push(`(LOWER(name) LIKE $${params.length} OR LOWER(COALESCE(description,'')) LIKE $${params.length})`);
    }

    let orderBy = 'id DESC';
    switch (sort) {
      case 'price_asc':
        orderBy = 'price ASC, id DESC';
        break;
      case 'price_desc':
        orderBy = 'price DESC, id DESC';
        break;
      case 'name_asc':
        orderBy = 'name ASC, id DESC';
        break;
      case 'promo':
        orderBy = 'is_promo DESC, id DESC';
        break;
      case 'newest':
      default:
        orderBy = 'id DESC';
        break;
    }

    const usePagination = page !== undefined || page_size !== undefined || limit !== undefined || sort !== undefined || q !== undefined || normalizedCategoryId !== undefined;

    if (!usePagination) {
      const sql = `SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY ${orderBy}`;
      const result = await pool.query(sql, params);
      return res.json(result.rows);
    }

    const safePage = Math.max(parseInt(page || '1', 10) || 1, 1);
    const safePageSize = Math.min(Math.max(parseInt(page_size || limit || '12', 10) || 12, 1), 50);
    const offset = (safePage - 1) * safePageSize;

    const countSql = `SELECT COUNT(*)::int AS total FROM products WHERE ${where.join(' AND ')}`;
    const dataSql = `SELECT * FROM products WHERE ${where.join(' AND ')} ORDER BY ${orderBy} LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;

    const [countResult, dataResult] = await Promise.all([
      pool.query(countSql, params),
      pool.query(dataSql, [...params, safePageSize, offset]),
    ]);

    const total = countResult.rows[0]?.total || 0;
    const totalPages = Math.max(Math.ceil(total / safePageSize), 1);

    res.json({
      items: dataResult.rows,
      pagination: {
        page: safePage,
        page_size: safePageSize,
        total,
        total_pages: totalPages,
        has_next: safePage < totalPages,
        has_prev: safePage > 1,
      },
      filters: {
        category_id: normalizedCategoryId ? Number(normalizedCategoryId) : null,
        q: q || '',
        sort: sort || 'newest',
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('SELECT * FROM products WHERE id=$1', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Produkt nie istnieje' });
    const product = result.rows[0];
    const [gallery, reviews] = await Promise.all([
      getProductGallery(id, product.image_url),
      getProductReviewsPayload(id),
    ]);
    res.json({ ...product, images: gallery, reviews });
  } catch (err) {
    if (err?.code === '42P01') {
      return res.status(500).json({ error: 'Brakuje tabel product_reviews lub product_images w bazie danych.' });
    }
    res.status(500).json({ error: err.message });
  }
};

export const getProductReviews = async (req, res) => {
  try {
    const { id } = req.params;
    const payload = await getProductReviewsPayload(id);
    res.json(payload);
  } catch (err) {
    if (err?.code === '42P01') {
      return res.status(500).json({ error: 'Brakuje tabel product_reviews lub product_images w bazie danych.' });
    }
    res.status(500).json({ error: err.message });
  }
};

export const addOrUpdateProductReview = async (req, res) => {
  try {
    const { id } = req.params;
    const rating = Number(req.body?.rating);
    const comment = normalizeOptionalString(req.body?.comment) ?? null;

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: 'Ocena musi być liczbą od 1 do 5.' });
    }

    const productRes = await pool.query('SELECT id FROM products WHERE id=$1 AND is_active=true', [id]);
    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: 'Produkt nie istnieje.' });
    }

      const result = await pool.query(
      `INSERT INTO product_reviews (product_id, user_id, rating, comment)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (product_id, user_id)
       DO UPDATE SET rating=EXCLUDED.rating, comment=EXCLUDED.comment, updated_at=CURRENT_TIMESTAMP
       RETURNING *`,
      [id, req.user.id, rating, comment]
    );

    const payload = await getProductReviewsPayload(id);
    res.json({ review: result.rows[0], reviews: payload });
  } catch (err) {
    if (err?.code === '42P01') {
      return res.status(500).json({ error: 'Brakuje tabeli product_reviews w bazie danych.' });
    }
    res.status(500).json({ error: err.message });
  }
};

export const createProduct = async (req, res) => {
  try {
    const priceParsed = normalizeNumber(req.body?.price, 'cena', { allowNull: false, min: 0 });
    if (!priceParsed.ok) return res.status(400).json({ error: priceParsed.error });

    const oldPriceParsed = normalizeNumber(req.body?.old_price, 'stara cena', { allowNull: true, min: 0 });
    if (!oldPriceParsed.ok) return res.status(400).json({ error: oldPriceParsed.error });

    const stockParsed = normalizeNumber(req.body?.stock, 'stan magazynowy', { allowNull: false, integer: true, min: 0 });
    if (!stockParsed.ok) return res.status(400).json({ error: stockParsed.error });

    const categoryParsed = normalizeNumber(req.body?.category_id, 'kategoria', { allowNull: true, integer: true, min: 1 });
    if (!categoryParsed.ok) return res.status(400).json({ error: categoryParsed.error });

    const payload = {
      name: String(req.body?.name || '').trim(),
      description: normalizeOptionalString(req.body?.description),
      price: priceParsed.value,
      old_price: oldPriceParsed.value,
      stock: stockParsed.value,
      category_id: categoryParsed.value ?? null,
      image_url: normalizeOptionalString(req.body?.image_url),
      is_featured: normalizeBoolean(req.body?.is_featured) ?? false,
      is_promo: normalizeBoolean(req.body?.is_promo) ?? false,
      is_active: normalizeBoolean(req.body?.is_active) ?? true,
    };

    const validationError = validateProductPayload(payload);
    if (validationError) return res.status(400).json({ error: validationError });

    if (!(await ensureCategoryExists(payload.category_id))) {
      return res.status(400).json({ error: 'Wybrana kategoria nie istnieje.' });
    }

    const result = await pool.query(
      `INSERT INTO products
        (name, description, price, old_price, stock, category_id, image_url, is_featured, is_promo, is_active)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       RETURNING *`,
      [
        payload.name,
        payload.description,
        payload.price,
        payload.old_price,
        payload.stock,
        payload.category_id,
        payload.image_url,
        payload.is_featured,
        payload.is_promo,
        payload.is_active,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const currentRes = await pool.query('SELECT * FROM products WHERE id=$1', [id]);
    if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Produkt nie istnieje' });

    const current = currentRes.rows[0];

    const priceParsed = normalizeNumber(req.body?.price, 'cena', { allowNull: false, min: 0 });
    if (!priceParsed.ok) return res.status(400).json({ error: priceParsed.error });

    const oldPriceParsed = normalizeNumber(req.body?.old_price, 'stara cena', { allowNull: true, min: 0 });
    if (!oldPriceParsed.ok) return res.status(400).json({ error: oldPriceParsed.error });

    const stockParsed = normalizeNumber(req.body?.stock, 'stan magazynowy', { allowNull: false, integer: true, min: 0 });
    if (!stockParsed.ok) return res.status(400).json({ error: stockParsed.error });

    const categoryParsed = normalizeNumber(req.body?.category_id, 'kategoria', { allowNull: true, integer: true, min: 1 });
    if (!categoryParsed.ok) return res.status(400).json({ error: categoryParsed.error });

    const payload = {
      name: req.body?.name !== undefined ? String(req.body.name || '').trim() : current.name,
      description: req.body?.description !== undefined ? normalizeOptionalString(req.body.description) : current.description,
      price: priceParsed.value !== undefined ? priceParsed.value : Number(current.price),
      old_price: oldPriceParsed.value !== undefined ? oldPriceParsed.value : current.old_price,
      stock: stockParsed.value !== undefined ? stockParsed.value : current.stock,
      category_id: categoryParsed.value !== undefined ? categoryParsed.value : current.category_id,
      image_url: req.body?.image_url !== undefined ? normalizeOptionalString(req.body.image_url) : current.image_url,
      is_featured: req.body?.is_featured !== undefined ? normalizeBoolean(req.body.is_featured) : current.is_featured,
      is_promo: req.body?.is_promo !== undefined ? normalizeBoolean(req.body.is_promo) : current.is_promo,
      is_active: req.body?.is_active !== undefined ? normalizeBoolean(req.body.is_active) : current.is_active,
    };

    const validationError = validateProductPayload(payload);
    if (validationError) return res.status(400).json({ error: validationError });

    if (!(await ensureCategoryExists(payload.category_id))) {
      return res.status(400).json({ error: 'Wybrana kategoria nie istnieje.' });
    }

    const result = await pool.query(
      `UPDATE products
          SET name=$1, description=$2, price=$3, old_price=$4, stock=$5,
              category_id=$6, image_url=$7, is_featured=$8, is_promo=$9, is_active=$10
        WHERE id=$11
        RETURNING *`,
      [
        payload.name,
        payload.description,
        payload.price,
        payload.old_price,
        payload.stock,
        payload.category_id,
        payload.image_url,
        payload.is_featured,
        payload.is_promo,
        payload.is_active,
        id,
      ]
    );

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('UPDATE products SET is_active=false WHERE id=$1 RETURNING *', [id]);
    if (result.rows.length === 0) return res.status(404).json({ error: 'Produkt nie istnieje' });
    res.json({ success: true, product: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const getAllProductsAdmin = async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM products ORDER BY id DESC');
    const items = await Promise.all(result.rows.map(async (row) => ({
      ...row,
      images: await getProductGallery(row.id, row.image_url),
    })));
    res.json(items);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const setProductImage = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.file) return res.status(400).json({ error: 'Nie przesłano pliku' });

    const imageUrl = `/images/products/${req.file.filename}`;
    const result = await pool.query(
      'UPDATE products SET image_url=$1 WHERE id=$2 RETURNING *',
      [imageUrl, id]
    );

    if (result.rows.length === 0) return res.status(404).json({ error: 'Produkt nie istnieje' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const addProductGalleryImages = async (req, res) => {
  try {
    const { id } = req.params;
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: 'Nie przesłano plików.' });
    }

    const productRes = await pool.query('SELECT id, image_url FROM products WHERE id=$1', [id]);
    if (productRes.rows.length === 0) {
      return res.status(404).json({ error: 'Produkt nie istnieje.' });
    }

      const currentCountRes = await pool.query('SELECT COUNT(*)::int AS total FROM product_images WHERE product_id=$1', [id]);
    const currentCount = Number(currentCountRes.rows[0]?.total || 0);
    if (currentCount + req.files.length > 8) {
      return res.status(400).json({ error: 'Galeria produktu może mieć maksymalnie 8 dodatkowych zdjęć.' });
    }

    const inserted = [];
    for (const [index, file] of req.files.entries()) {
      const imageUrl = `/images/products/${file.filename}`;
      const insertRes = await pool.query(
        `INSERT INTO product_images (product_id, image_url, sort_order)
         VALUES ($1,$2,$3)
         RETURNING *`,
        [id, imageUrl, currentCount + index + 1]
      );
      inserted.push(insertRes.rows[0]);
    }

    const gallery = await getProductGallery(id, productRes.rows[0].image_url);
    res.json({ items: inserted, gallery });
  } catch (err) {
    if (err?.code === '42P01') {
      return res.status(500).json({ error: 'Brakuje tabeli product_images w bazie danych.' });
    }
    res.status(500).json({ error: err.message });
  }
};

export const deleteProductGalleryImage = async (req, res) => {
  try {
    const { id, imageId } = req.params;
      const result = await pool.query(
      'DELETE FROM product_images WHERE id=$1 AND product_id=$2 RETURNING *',
      [imageId, id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Zdjęcie galerii nie istnieje.' });
    }
    const productRes = await pool.query('SELECT image_url FROM products WHERE id=$1', [id]);
    const gallery = await getProductGallery(id, productRes.rows[0]?.image_url || null);
    res.json({ success: true, gallery });
  } catch (err) {
    if (err?.code === '42P01') {
      return res.status(500).json({ error: 'Brakuje tabeli product_images w bazie danych.' });
    }
    res.status(500).json({ error: err.message });
  }
};

export const updateProductStock = async (req, res) => {
  try {
    const { id } = req.params;
    const { stock, change_quantity, movement_type, note } = req.body || {};

    const currentRes = await pool.query('SELECT * FROM products WHERE id=$1', [id]);
    if (currentRes.rows.length === 0) return res.status(404).json({ error: 'Produkt nie istnieje' });
    const current = currentRes.rows[0];

    let nextStock = null;
    let delta = null;

    if (stock !== undefined && stock !== null && stock !== '') {
      const parsed = Number(stock);
      if (!Number.isInteger(parsed) || parsed < 0) {
        return res.status(400).json({ error: 'Stan magazynowy musi być liczbą całkowitą większą lub równą 0.' });
      }
      nextStock = parsed;
      delta = parsed - Number(current.stock || 0);
    } else if (change_quantity !== undefined && change_quantity !== null && change_quantity !== '') {
      const parsedDelta = Number(change_quantity);
      if (!Number.isInteger(parsedDelta)) {
        return res.status(400).json({ error: 'Zmiana ilości musi być liczbą całkowitą.' });
      }
      nextStock = Number(current.stock || 0) + parsedDelta;
      if (nextStock < 0) {
        return res.status(400).json({ error: 'Stan magazynowy po zmianie nie może być ujemny.' });
      }
      delta = parsedDelta;
    } else {
      return res.status(400).json({ error: 'Podaj nowy stan lub zmianę ilości.' });
    }

    const allowedMovementTypes = new Set(['delivery', 'correction', 'manual']);
    const normalizedMovementType = allowedMovementTypes.has(String(movement_type || '').toLowerCase())
      ? String(movement_type).toLowerCase()
      : (delta >= 0 ? 'delivery' : 'correction');

    await pool.query('BEGIN');
    const updatedRes = await pool.query(
      'UPDATE products SET stock=$1 WHERE id=$2 RETURNING *',
      [nextStock, id]
    );

    try {
      await pool.query(
        `INSERT INTO stock_movements (product_id, user_id, change_quantity, movement_type, note)
         VALUES ($1,$2,$3,$4,$5)`,
        [id, req.user.id, delta, normalizedMovementType, note ? String(note).trim() : null]
      );
    } catch (movementErr) {
      await pool.query('ROLLBACK');
      return res.status(500).json({ error: 'Nie udało się zapisać ruchu magazynowego. Sprawdź tabelę stock_movements.' });
    }

    await pool.query('COMMIT');
    res.json(updatedRes.rows[0]);
  } catch (err) {
    await pool.query('ROLLBACK').catch(() => {});
    res.status(500).json({ error: err.message });
  }
};

export const getProductStockMovements = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT sm.*, u.name AS user_name
       FROM stock_movements sm
       LEFT JOIN users u ON u.id = sm.user_id
       WHERE sm.product_id=$1
       ORDER BY sm.created_at DESC, sm.id DESC
       LIMIT 50`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
