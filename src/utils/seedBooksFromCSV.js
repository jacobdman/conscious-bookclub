import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc } from "firebase/firestore";
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBmG4u5Kv4nt-5F5XfZhKNsyg9MJ-h96Qo",
  authDomain: "conscious-bookclub-87073-9eb71.firebaseapp.com",
  projectId: "conscious-bookclub-87073-9eb71",
  storageBucket: "conscious-bookclub-87073-9eb71.appspot.com",
  messagingSenderId: "499467823747",
  appId: "1:499467823747:web:4146c4e1a9e368c83549b6"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Get current file directory for CSV path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Function to parse CSV data
function parseCSV(csvContent) {
  const lines = csvContent.split('\n');
  const headers = lines[0].split(',');
  const books = [];
  
  // Process rows 2-62 (index 1-61), skip empty rows
  for (let i = 1; i < Math.min(63, lines.length); i++) {
    const line = lines[i].trim();
    if (!line) continue; // Skip empty lines
    
    const values = line.split(',');
    if (values.length < 8) continue; // Skip incomplete rows
    
    const book = {
      title: values[0]?.trim() || '',
      author: values[1]?.trim() || '',
      genre: values[2]?.trim() || null,
      fiction: values[3]?.trim().toLowerCase() === 'true',
      theme: values[4]?.trim() || '',
      discussionDate: values[5]?.trim() || null,
      link: values[6]?.trim() || null,
      comments: values[7]?.trim() || null
    };
    
    // Only add books with titles
    if (book.title) {
      books.push(book);
    }
  }
  
  return books;
}

// Function to transform book data for Firestore
function transformBookData(csvBook) {
  // Parse theme string into array
  let themes = [];
  if (csvBook.theme) {
    themes = csvBook.theme.split(',').map(t => t.trim()).filter(t => t);
  }
  
  // Parse discussion date
  let discussionDate = null;
  if (csvBook.discussionDate) {
    try {
      // Handle M/D/YYYY format
      const [month, day, year] = csvBook.discussionDate.split('/');
      if (month && day && year) {
        discussionDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      }
    } catch (error) {
      // Failed to parse date
    }
  }
  
  return {
    title: csvBook.title,
    author: csvBook.author,
    genre: csvBook.genre || null,
    fiction: csvBook.fiction,
    theme: themes,
    discussionDate: discussionDate,
    coverUrl: null, // Will be added manually later
    createdAt: new Date()
  };
}

// Function to add book to Firestore
async function addBookToFirestore(bookData) {
  try {
    const docRef = await addDoc(collection(db, "books"), bookData);
    return docRef.id;
  } catch (error) {
    throw error;
  }
}

// Main seed function
async function seedBooks() {
  try {
    // Read CSV file
    const csvPath = path.join(__dirname, '../../book_list.csv');
    
    if (!fs.existsSync(csvPath)) {
      throw new Error(`CSV file not found at: ${csvPath}`);
    }
    
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const csvBooks = parseCSV(csvContent);
    
    // Transform and add books to Firestore
    let successCount = 0;
    let errorCount = 0;
    
    for (const csvBook of csvBooks) {
      try {
        const bookData = transformBookData(csvBook);
        await addBookToFirestore(bookData);
        successCount++;
      } catch (error) {
        errorCount++;
      }
    }
    
    
  } catch (error) {
    process.exit(1);
  }
}

// Run the seed function
seedBooks()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });
