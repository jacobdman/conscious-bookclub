import { addBook } from '../services/firestoreService';

// Sample book data following your schema
const sampleBooks = [
  {
    title: "Atomic Habits",
    author: "James Clear",
    coverUrl: "https://images-na.ssl-images-amazon.com/images/I/51Tlm0Gp+EL._SX342_SY445_.jpg",
    theme: "Personal Development",
    discussionDate: new Date("2024-02-15")
  },
  {
    title: "The Power of Now",
    author: "Eckhart Tolle",
    coverUrl: "https://images-na.ssl-images-amazon.com/images/I/41Q9vQ+7kEL._SX342_SY445_.jpg",
    theme: "Mindfulness & Spirituality",
    discussionDate: new Date("2024-03-01")
  },
  {
    title: "Thinking, Fast and Slow",
    author: "Daniel Kahneman",
    coverUrl: "https://images-na.ssl-images-amazon.com/images/I/41uPjEenKFL._SX342_SY445_.jpg",
    theme: "Psychology & Decision Making",
    discussionDate: new Date("2024-03-15")
  },
  {
    title: "The Seven Habits of Highly Effective People",
    author: "Stephen R. Covey",
    coverUrl: "https://images-na.ssl-images-amazon.com/images/I/51T7Qf2lf2L._SX342_SY445_.jpg",
    theme: "Leadership & Productivity",
    discussionDate: new Date("2024-04-01")
  },
  {
    title: "Man's Search for Meaning",
    author: "Viktor E. Frankl",
    coverUrl: "https://images-na.ssl-images-amazon.com/images/I/41+grDTP2FL._SX342_SY445_.jpg",
    theme: "Philosophy & Resilience",
    discussionDate: new Date("2024-04-15")
  }
];

// Function to seed the books collection
export const seedBooks = async () => {
  try {
    console.log('Starting to seed books collection...');
    
    for (const book of sampleBooks) {
      await addBook(book);
      console.log(`Added book: ${book.title} by ${book.author}`);
    }
    
    console.log('Successfully seeded books collection!');
  } catch (error) {
    console.error('Error seeding books:', error);
  }
};

// Function to add a single book (useful for testing)
export const addSampleBook = async (bookData) => {
  try {
    const book = {
      title: bookData.title || "Sample Book",
      author: bookData.author || "Sample Author",
      coverUrl: bookData.coverUrl || "https://via.placeholder.com/300x400?text=No+Cover",
      theme: bookData.theme || "General",
      discussionDate: bookData.discussionDate || new Date()
    };
    
    await addBook(book);
    console.log(`Added book: ${book.title} by ${book.author}`);
  } catch (error) {
    console.error('Error adding book:', error);
  }
};
