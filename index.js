const express = require('express')
const sass = require('node-sass-middleware')
const app = express()
const port = 1337

app.use(express.static('./'))

app.use(
  sass({
      src: __dirname, //where the sass files are
      dest: __dirname, //where css should go
      debug: true // obvious
  })
);

app.get('/', (req, res) => res.static('index'))

app.listen(port, () => console.log(`app listening on port ${port}`))