import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import {
  getPosts,
  createPost,
  getPostById,
  getCommentsByPostId,
  createComment,
} from '../controllers/forumController.js';

const router = express.Router();

// Public: każdy może czytać
router.get('/posts', getPosts);

// Public: szczegóły wpisu
router.get('/posts/:id', getPostById);

// Public: komentarze do wpisu
router.get('/posts/:id/comments', getCommentsByPostId);

// Tylko zalogowani: tworzenie wpisu
router.post('/posts', protect, createPost);

// Auth: dodanie komentarza
router.post('/posts/:id/comments', protect, createComment);

export default router;
