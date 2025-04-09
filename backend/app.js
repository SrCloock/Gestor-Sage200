const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const { connect } = require('./config/sage200db');
const routes = require('./routes/index');
const errorMiddleware = require('./middlewares/errorMiddleware');

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api', routes);
app.use(errorMiddleware);

const PORT = process.env.PORT || 5000;
connect()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`🚀 Servidor backend corriendo en http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Error al iniciar el backend:', err);
  });
