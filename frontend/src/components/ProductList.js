import React from 'react';
import ProductCard from './ProductCard';

export default function ProductList({ products, onAddToCart }) {
  return (
   <div className="row">
  {products.map(p => (
    <ProductCard key={p.id} product={p} onAddToCart={onAddToCart} />
  ))}
</div>
  );
}
