const express = require('express');
const cors = require('cors');

const authRoutes = require('./routes/authRoutes');
const healthRoutes = require('./routes/healthRoutes');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const documentRoutes = require('./routes/documentRoutes');
const aiRoutes = require('./routes/aiRoutes');

const app = express();

app.use(express.json());

app.use(
  cors({
    origin: 'http://localhost:5173',
  })
);

app.use('/api/auth', authRoutes);
app.use('/api/health', healthRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api', aiRoutes);

module.exports = app;