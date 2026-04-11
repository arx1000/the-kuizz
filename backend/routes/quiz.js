const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const Quiz = require('../models/Quiz');
const User = require('../models/User');

const router = express.Router();

const authMiddleware = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'default-secret');
    const user = await User.findById(decoded.userId);
    
    if (!user || user.isGuest) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: 'Invalid token' });
  }
};

router.post('/', authMiddleware, [
  body('title').trim().isLength({ min: 1, max: 100 }),
  body('questions').isArray({ min: 1 }),
  body('questions.*.questionText').trim().notEmpty(),
  body('questions.*.options').isArray({ min: 4, max: 4 }),
  body('questions.*.correctAnswer').isInt({ min: 0, max: 3 }),
  body('questions.*.timeLimit').isInt({ min: 5, max: 30 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { title, description, questions, isPublic } = req.body;

    const quiz = new Quiz({
      title,
      description,
      questions,
      creator: req.user._id,
      isPublic: isPublic !== false
    });

    await quiz.save();
    req.user.quizzesCreated.push(quiz._id);
    await req.user.save();

    res.status(201).json(quiz);
  } catch (error) {
    console.error('Quiz creation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/', async (req, res) => {
  try {
    const { search, limit = 20, offset = 0 } = req.query;
    
    const query = { isPublic: true };
    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const quizzes = await Quiz.find(query)
      .populate('creator', 'username')
      .sort({ playCount: -1, createdAt: -1 })
      .skip(parseInt(offset))
      .limit(parseInt(limit));

    const total = await Quiz.countDocuments(query);

    res.json({ quizzes, total });
  } catch (error) {
    console.error('Quiz list error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/my', authMiddleware, async (req, res) => {
  try {
    const quizzes = await Quiz.find({ creator: req.user._id })
      .sort({ createdAt: -1 });
    res.json(quizzes);
  } catch (error) {
    console.error('My quizzes error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const quiz = await Quiz.findById(req.params.id)
      .populate('creator', 'username');
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found' });
    }

    res.json(quiz);
  } catch (error) {
    console.error('Quiz fetch error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findOne({ _id: req.params.id, creator: req.user._id });
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found or unauthorized' });
    }

    const { title, description, questions, isPublic } = req.body;
    
    if (title) quiz.title = title;
    if (description !== undefined) quiz.description = description;
    if (questions) quiz.questions = questions;
    if (isPublic !== undefined) quiz.isPublic = isPublic;

    await quiz.save();
    res.json(quiz);
  } catch (error) {
    console.error('Quiz update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const quiz = await Quiz.findOneAndDelete({ _id: req.params.id, creator: req.user._id });
    
    if (!quiz) {
      return res.status(404).json({ message: 'Quiz not found or unauthorized' });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { quizzesCreated: quiz._id }
    });

    res.json({ message: 'Quiz deleted successfully' });
  } catch (error) {
    console.error('Quiz delete error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
