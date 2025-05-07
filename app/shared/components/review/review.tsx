import React from 'react';
import styles from './review.module.css';

interface ReviewProps {
  rating: number;
  text: string;
  author: string;
  date: string;
}

const Review: React.FC<ReviewProps> = ({ rating, text, author, date }) => {
  const renderStars = () => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <svg
          key={i}
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill={i <= rating ? "#FFD700" : "#e0e0e0"}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.773 1.4 8.168L12 18.897l-7.334 3.854 1.4-8.168-5.934-5.773 8.2-1.192L12 .587z"/>
        </svg>
      );
    }
    return stars;
  };

  return (
    <div className={styles.review}>
      <div className={styles.reviewHeader}>
        <div className={styles.stars}>{renderStars()}</div>
        <span className={styles.date}>{date}</span>
      </div>
      <p className={styles.text}>{text}</p>
      <div className={styles.author}>- {author}</div>
    </div>
  );
};

export default Review;
