import React from 'react';

const ProductCard = ({ product, onAddToCart }) => {
  return (
    <div className="col-md-4 mb-4">
      <div className="card h-100 shadow-sm">
        <div className="card-body d-flex flex-column">
          <h5 className="card-title">{product.name}</h5>
          <p className="card-text text-muted">{product.description}</p>

          <div className="mt-auto">
            <p className="fw-bold">{product.price} zł</p>
            <button
              className="btn btn-primary w-100"
              onClick={() => onAddToCart(product)}
            >
              Dodaj do koszyka
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
