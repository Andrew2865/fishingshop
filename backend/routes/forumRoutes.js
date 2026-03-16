import express from 'express';
import { protect } from '../middleware/authMiddleware.js';
import { uploadForumImages } from '../middleware/uploadForum.js';
import {
  getPosts,
  createPost,
  getPostById,
  getCommentsByPostId,
  createComment,
} from '../controllers/forumController.js';

const router = express.Router();

router.get('/posts', getPosts);
router.get('/posts/:id', getPostById);
router.get('/posts/:id/comments', getCommentsByPostId);
router.post('/posts', protect, uploadForumImages.array('images', 4), createPost);
router.post('/posts/:id/comments', protect, uploadForumImages.array('images', 4), createComment);

export default router;
