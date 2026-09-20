import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { TrendingUp, TrendingDown, Clock, AlertCircle, Play, Activity, PackageX, Percent, RefreshCw } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from './Toast';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [scraping, setScraping] = useState(false);
  const [sortBy, setSortBy] = useState('discount');
  const { showToast } = useToast();
  
  const pollInterval = useRef(null);

  const fetchTracked = async (silent = false) => {
    try {
      if (!silent) setLoading(true);
      const data = await api.getTracked();
      setProducts(data);
    } catch (err) {
      if (!silent) setError(err.message);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchTracked();
    return () => clearInterval(pollInterval.current);
  }, []);

  const handleManualScrape = async () => {
    try {
      setScraping(true);
      showToast('Scrape started in background! This usually takes 1-2 minutes.', 'info');
      
      // Start polling every 8 seconds to show live updates
      pollInterval.current = setInterval(() => {
        fetchTracked(true);
      }, 8000);

      await api.triggerScrape();
      
      clearInterval(pollInterval.current);
      setScraping(false);
      fetchTracked(true);
      showToast('Scraping complete! Prices are updated.', 'success');
    } catch (err) {
      clearInterval(pollInterval.current);
      setScraping(false);
      showToast(`Error triggering scrape: ${err.message}`, 'error');
    }
  };

  // --- Calculations for Stats ---
  const validPrices = products.filter(p => p.latestPrice && p.latestPrice.price != null);
  const avgDiscount = validPrices.length > 0 
    ? Math.round(validPrices.reduce((acc, p) => acc + (p.latestPrice.discount_pct || 0), 0) / validPrices.length) 
    : 0;
  const outOfStockCount = validPrices.filter(p => p.latestPrice.stock === 0).length;

  // --- Sorting ---
  const sortedProducts = [...products].sort((a, b) => {
    const priceA = a.latestPrice;
    const priceB = b.latestPrice;
    
    if (sortBy === 'discount') {
      const discA = priceA?.discount_pct || 0;
      const discB = priceB?.discount_pct || 0;
      return discB - discA;
    }
    if (sortBy === 'price') {
      const pA = priceA?.price || Infinity;
      const pB = priceB?.price || Infinity;
      return pA - pB;
    }
    if (sortBy === 'recent') {
      const timeA = a.lastScrape ? new Date(a.lastScrape.created_at).getTime() : 0;
      const timeB = b.lastScrape ? new Date(b.lastScrape.created_at).getTime() : 0;
      return timeB - timeA;
    }
    // Name A-Z
    return a.name.localeCompare(b.name);
  });

  if (loading) return (
    <div className="loader">
      <div className="spinner"><Activity /></div>
      Loading dashboard...
    </div>
  );

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="page-title text-gradient">Dashboard</h1>
          <p className="page-subtitle">Monitoring {products.length} products</p>
        </div>
        <button 
          className="btn btn-primary" 
          onClick={handleManualScrape}
          disabled={scraping || products.length === 0}
          style={{ transition: 'all 0.3s' }}
        >
          {scraping ? <RefreshCw size={16} className="spinner" /> : <Play size={16} />}
          {scraping ? 'Scraping in progress...' : 'Trigger Scrape Now'}
        </button>
      </div>

      {scraping && (
        <div className="progress-container">
          <div className="progress-bar"></div>
        </div>
      )}

      {error && (
        <div className="card mb-4" style={{ borderColor: 'var(--danger)' }}>
          <div className="flex items-center gap-2" style={{ color: 'var(--danger)' }}>
            <AlertCircle size={20} />
            {error}
          </div>
        </div>
      )}

      {products.length > 0 && (
        <>
          {/* Stats Row */}
          <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', marginBottom: '2rem' }}>
            <div className="card stat-card" style={{ borderTopColor: 'var(--accent-primary)' }}>
              <div className="stat-label flex items-center gap-2"><Activity size={16} /> Total Tracked</div>
              <div className="stat-value">{products.length}</div>
            </div>
            <div className="card stat-card" style={{ borderTopColor: 'var(--success)' }}>
              <div className="stat-label flex items-center gap-2"><Percent size={16} /> Avg Discount</div>
              <div className="stat-value">{avgDiscount}%</div>
            </div>
            <div className="card stat-card" style={{ borderTopColor: 'var(--warning)' }}>
              <div className="stat-label flex items-center gap-2"><PackageX size={16} /> Out of Stock</div>
              <div className="stat-value">{outOfStockCount}</div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex" style={{ justifyContent: 'flex-end', marginBottom: '1rem', alignItems: 'center', gap: '1rem' }}>
            <label className="text-muted" style={{ fontSize: '0.875rem' }}>Sort by:</label>
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                background: 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border)',
                padding: '0.5rem 1rem',
                borderRadius: 'var(--radius-md)',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="discount">Highest Discount</option>
              <option value="price">Lowest Price</option>
              <option value="recent">Recently Updated</option>
              <option value="name">Name (A-Z)</option>
            </select>
          </div>
        </>
      )}

      {products.length === 0 ? (
        <div className="card text-center py-12">
          <h3 className="mb-4">No products tracked yet</h3>
          <p className="text-muted mb-6">Search for products from the INE store to start tracking them.</p>
          <Link to="/search" className="btn btn-primary">Find Products</Link>
        </div>
      ) : (
        <div className="grid">
          {sortedProducts.map(product => {
            const price = product.latestPrice;
            const log = product.lastScrape;
            
            return (
              <Link to={`/product/${product.product_id}`} key={product.id} className="card interactive product-card">
                <div className="product-brand">{product.brand || 'Brand'}</div>
                <h3 className="product-name">{product.name}</h3>
                
                {price ? (
                  <div className="mt-4">
                    <div className="product-price">
                      ₹{price.price?.toLocaleString()}
                      {price.mrp && price.mrp > price.price && (
                        <span className="mrp">₹{price.mrp?.toLocaleString()}</span>
                      )}
                    </div>
                    {price.discount_pct > 0 && (
                      <span className="badge success mt-2">{price.discount_pct}% OFF</span>
                    )}
                  </div>
                ) : (
                  <div className="mt-4 text-muted flex items-center gap-2">
                    <Clock size={16} /> Waiting for first scrape
                  </div>
                )}
                
                <div className="product-meta">
                  <span>
                    Status: {log ? (
                      <span className={`badge ${log.status === 'failed' ? 'danger' : 'success'}`}>
                        {log.status}
                      </span>
                    ) : 'Pending'}
                  </span>
                  <span>
                    {log?.created_at ? formatDistanceToNow(new Date(log.created_at), { addSuffix: true }) : 'Never'}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
