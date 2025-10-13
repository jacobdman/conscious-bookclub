# Book Seeding Instructions

## Overview
This document explains how to seed your Firestore database with books from the CSV file.

## Prerequisites
- Firebase project is set up and configured
- You have the necessary permissions to write to Firestore
- The `book_list.csv` file is in the project root

## Running the Seed Script

1. **Make sure you're in the project root directory:**
   ```bash
   cd /Users/jacobdayton/projects/conscious-bookclub
   ```

2. **Run the seed script:**
   ```bash
   npm run seed
   ```
   
   Or run directly:
   ```bash
   node src/utils/seedBooksFromCSV.js
   ```

## What the Script Does

- Parses the `book_list.csv` file
- Transforms the data to match your Firestore schema:
  - `title` (required)
  - `author` (required) 
  - `genre` (optional)
  - `fiction` (boolean - NEW field)
  - `theme` (array of strings: "Classy", "Curious", "Creative")
  - `discussionDate` (JavaScript Date object or null)
  - `coverUrl` (null - can be added manually later)
  - `createdAt` (current timestamp)

- Adds all books to the "books" collection in Firestore
- Provides progress logging and error handling

## Expected Output
The script will show:
- Number of books found in CSV
- Progress as each book is added
- Final summary with success/error counts

## After Seeding
- The script can be safely deleted after successful import
- You can manually add Amazon cover URLs to books later
- The `fiction` field is now available in your book data (you may want to add it to AddBookForm later)

## Troubleshooting
- Make sure `book_list.csv` is in the project root
- Ensure Firebase credentials are properly configured
- Check that you have write permissions to Firestore
