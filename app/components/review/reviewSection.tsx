import React, { useState } from 'react';
import styles from './reviewSection.module.css';
import Review from './review';

const reviewsData = [
  { rating: 5, text: 'Чудовий сервіс та якість!', author: 'Іван Іваненко', date: '2024-10-27' },
  { rating: 4, text: 'Все було добре, але є куди рости.', author: 'Марія Коваль', date: '2024-10-20' },
  { rating: 3, text: 'Задоволений на 3 з 5.', author: 'Олег Петренко', date: '2024-10-15' },    
  { rating: 5, text: 'Все було чудово, дякую!', author: 'Ірина Сидоренко', date: '2024-10-10' },
  { rating: 4, text: 'Дуже гарний сервіс, але ціни трохи високі. Дуже гарний сервіс, але ціни трохи високі. Дуже гарний сервіс, але ціни трохи високі.', author: 'Петро Іванов', date: '2024-10-05' },
  { rating: 3, text: 'Задоволений на 3 з 5.', author: 'Олег Петренко', date: '2024-10-15' },
  { rating: 5, text: 'Все було чудово, дякую!', author: 'Ірина Сидоренко', date: '2024-10-10' },
  { rating: 4, text: 'Дуже гарний сервіс, але ціни трохи високі.', author: 'Петро Іванов', date: '2024-10-05' },
  { rating: 3, text: 'Задоволений на 3 з 5.', author: 'Олег Петренко', date: '2024-10-15' },
  
];

const ReviewsSection = () => {
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 3;
  const totalPages = Math.ceil(reviewsData.length / reviewsPerPage);

  // Determine which reviews to show based on the current page
  const startIndex = (currentPage - 1) * reviewsPerPage;
  const currentReviews = reviewsData.slice(startIndex, startIndex + reviewsPerPage);

  const handlePageChange = (page: React.SetStateAction<number>) => {
    setCurrentPage(page);
  };

  return (
    <section className={styles.bodyReviews}>

      <div className={styles.reviewsRow}>
        {currentReviews.map((review, index) => (
          <Review
            key={index}
            rating={review.rating}
            text={review.text}
            author={review.author}
            date={review.date}
          />
        ))}
      </div>
    </section>
  );
};

export default ReviewsSection;
