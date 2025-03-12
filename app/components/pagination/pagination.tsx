// import React from "react";
// import styles from "./pagination.module.css";

// interface PaginationProps {
//   currentPage: number;
//   totalPages: number;
//   onPageChange: (page: number) => void;
// }

// const Pagination: React.FC<PaginationProps> = ({ currentPage, totalPages, onPageChange }) => {

//   // Function to go to the next page
//   const nextPage = () => {
//     if (currentPage < totalPages) onPageChange(currentPage + 1);
//   };

//   // Function to go to the previous page
//   const prevPage = () => {
//     if (currentPage > 1) onPageChange(currentPage - 1);
//   };

//   // Logic to determine which page circles to display
//   const getDisplayedPages = () => {
//     if (totalPages <= 3) {
//       return Array.from({ length: totalPages }, (_, i) => i + 1); // Show all pages if total is 3 or less
//     }

//     if (currentPage === 1) {
//       return [1, 2, 3]; // Show first three pages if on the first page
//     } else if (currentPage === totalPages) {
//       return [totalPages - 2, totalPages - 1, totalPages]; // Show last three pages if on the last page
//     } else {
//       return [currentPage - 1, currentPage, currentPage + 1]; // Show the previous, current, and next page
//     }
//   };

//   return (
//     <div className={styles.pagination}>
//       {/* Previous Arrow */}
//       <button onClick={prevPage} disabled={currentPage === 1} className={styles.arrowButton}>
//         <svg width="34" height="24" viewBox="0 0 24 14" fill="none" xmlns="http://www.w3.org/2000/svg">
//           <path
//             d="M22.6663 7H1.33301M1.33301 7L9.33301 13M1.33301 7L9.33301 1"
//             stroke="#160101"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//           />
//         </svg>
//       </button>

//       {/* Pagination Circles */}
//       {getDisplayedPages().map((page) => (
//         <div
//           key={page}
//           onClick={() => onPageChange(page)}
//           className={`${styles.paginationCircle} ${currentPage === page ? styles.active : ""}`}
//         />
//       ))}

//       {/* Next Arrow */}
//       <button onClick={nextPage} disabled={currentPage === totalPages} className={styles.arrowButton}>
//         <svg width="34" height="24" viewBox="0 0 24 14" fill="none" xmlns="http://www.w3.org/2000/svg">
//           <path
//             d="M1.33301 7H22.6663M22.6663 7L14.6663 1M22.6663 7L14.6663 13"
//             stroke="#160101"
//             strokeLinecap="round"
//             strokeLinejoin="round"
//           />
//         </svg>
//       </button>
//     </div>
//   );
// };

// export default Pagination;
