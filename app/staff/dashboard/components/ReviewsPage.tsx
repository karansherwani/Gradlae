'use client';

import { useState, useEffect } from 'react';
import styles from '../../../styles/staff-dashboard.module.css';

interface Review {
  id: string;
  studentName: string;
  course: string;
  rating: number;
  text: string;
  date: string;
  sessionDate: string;
  helpful: number;
}

export default function ReviewsPage({ staffId }: { staffId: string }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [filter, setFilter] = useState<'all' | '5' | '4' | '3' | '2' | '1'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'rating' | 'helpful'>('recent');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReviews();
  }, [staffId]);

  const loadReviews = async () => {
    try {
      const response = await fetch(`/api/staff/reviews?staffId=${staffId}`);
      if (response.ok) {
        const data = await response.json();
        setReviews(data.reviews || []);
      }
    } catch (error) {
      console.error('Error loading reviews:', error);
    } finally {
      setLoading(false);
    }
  };

  // Calculate statistics
  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
    : '0.0';

  const ratingDistribution = {
    5: reviews.filter(r => r.rating === 5).length,
    4: reviews.filter(r => r.rating === 4).length,
    3: reviews.filter(r => r.rating === 3).length,
    2: reviews.filter(r => r.rating === 2).length,
    1: reviews.filter(r => r.rating === 1).length,
  };

  // Filter and sort
  const filteredReviews = reviews
    .filter(r => filter === 'all' || r.rating === parseInt(filter))
    .sort((a, b) => {
      if (sortBy === 'recent') return new Date(b.date).getTime() - new Date(a.date).getTime();
      if (sortBy === 'rating') return b.rating - a.rating;
      if (sortBy === 'helpful') return b.helpful - a.helpful;
      return 0;
    });

  const renderStars = (rating: number, size: 'small' | 'large' = 'small') => {
    return (
      <div className={size === 'large' ? styles.starsLarge : styles.starsSmall}>
        <span>{rating}/5</span>
      </div>
    );
  };

  return (
    <div className={styles.reviewsContainer}>
      <div className={styles.reviewsHeader}>
        <div>
          <h1 className={styles.pageTitle}>Student Reviews</h1>
          <p className={styles.pageSubtitle}>See what students are saying about your tutoring</p>
        </div>
      </div>

      {/* Stats Overview */}
      <div className={styles.reviewsStats}>
        <div className={styles.ratingOverview}>
          <div className={styles.ratingScore}>
            <div className={styles.ratingNumber}>{averageRating}</div>
            {renderStars(Math.round(parseFloat(averageRating)), 'large')}
            <div className={styles.ratingCount}>{reviews.length} reviews</div>
          </div>
        </div>

        <div className={styles.ratingBars}>
          {[5, 4, 3, 2, 1].map(star => {
            const count = ratingDistribution[star as keyof typeof ratingDistribution];
            const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
            
            return (
              <div key={star} className={styles.ratingBar}>
                <span className={styles.ratingBarLabel}>{star} stars</span>
                <div className={styles.ratingBarTrack}>
                  <div 
                    className={styles.ratingBarFill} 
                    style={{ width: `${percentage}%` }}
                  />
                </div>
                <span className={styles.ratingBarCount}>{count}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Filters and Sort */}
      <div className={styles.reviewsControls}>
        <div className={styles.filterButtons}>
          <button
            className={`${styles.filterBtn} ${filter === 'all' ? styles.filterBtnActive : ''}`}
            onClick={() => setFilter('all')}
          >
            All Reviews
          </button>
          {[5, 4, 3, 2, 1].map(star => (
            <button
              key={star}
              className={`${styles.filterBtn} ${filter === String(star) ? styles.filterBtnActive : ''}`}
              onClick={() => setFilter(String(star) as any)}
            >
              {star} stars
            </button>
          ))}
        </div>

        <select
          className={styles.sortSelect}
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
        >
          <option value="recent">Most Recent</option>
          <option value="rating">Highest Rated</option>
          <option value="helpful">Most Helpful</option>
        </select>
      </div>

      {/* Reviews List */}
      {loading ? (
        <div className={styles.loadingState}>
          <div className={styles.spinner}></div>
          <p>Loading reviews...</p>
        </div>
      ) : filteredReviews.length === 0 ? (
        <div className={styles.emptyState}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
          </svg>
          <h3>No reviews yet</h3>
          <p>
            {filter !== 'all' 
              ? `No ${filter}-star reviews to display.`
              : "You haven't received any reviews yet. Complete some tutoring sessions to start getting feedback!"}
          </p>
        </div>
      ) : (
        <div className={styles.reviewsList}>
          {filteredReviews.map(review => (
            <div key={review.id} className={styles.reviewCard}>
              <div className={styles.reviewCardHeader}>
                <div className={styles.reviewerInfo}>
                  <div className={styles.reviewerAvatar}>
                    {review.studentName.split(' ').map(n => n[0]).join('').toUpperCase()}
                  </div>
                  <div>
                    <div className={styles.reviewerName}>{review.studentName}</div>
                    <div className={styles.reviewMeta}>
                      <span className={styles.reviewCourse}>{review.course}</span>
                      <span className={styles.reviewDate}>
                        Session on {review.sessionDate}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.reviewRatingBadge}>
                  {renderStars(review.rating)}
                  <span className={styles.ratingValue}>{review.rating}.0</span>
                </div>
              </div>

              <p className={styles.reviewText}>{review.text}</p>

              <div className={styles.reviewFooter}>
                <span className={styles.reviewPostedDate}>
                  Posted {review.date}
                </span>
                <div className={styles.reviewActions}>
                  <button className={styles.helpfulBtn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3" />
                    </svg>
                    Helpful ({review.helpful})
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Insights */}
      {reviews.length > 0 && (
        <div className={styles.insightsCard}>
          <h3 className={styles.insightsTitle}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 20V10" />
              <path d="M12 20V4" />
              <path d="M6 20v-6" />
            </svg>
            Review Insights
          </h3>
          <div className={styles.insightsGrid}>
            <div className={styles.insightItem}>
              <div className={styles.insightValue}>{averageRating}/5.0</div>
              <div className={styles.insightLabel}>Average Rating</div>
            </div>
            <div className={styles.insightItem}>
              <div className={styles.insightValue}>
                {Math.round((reviews.filter(r => r.rating >= 4).length / reviews.length) * 100)}%
              </div>
              <div className={styles.insightLabel}>Positive Reviews</div>
            </div>
            <div className={styles.insightItem}>
              <div className={styles.insightValue}>{reviews.length}</div>
              <div className={styles.insightLabel}>Total Reviews</div>
            </div>
            <div className={styles.insightItem}>
              <div className={styles.insightValue}>
                {reviews.filter(r => new Date(r.date).getMonth() === new Date().getMonth()).length}
              </div>
              <div className={styles.insightLabel}>This Month</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
