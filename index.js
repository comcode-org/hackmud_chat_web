const express = require('express')
const sass = require('sass')
const sassMiddleware = require('node-sass-middleware')
const eyeglass = require("eyeglass");

const app = express()
const port = 1337

app.use(
  sassMiddleware(
    eyeglass({
      src: __dirname, //where the sass files are
      dest: __dirname, //where css should go
      debug: true, // obvious
    })
  )
)

app.use(express.static('./'))

app.get('/', (req, res) => res.static('index'))

app.listen(port, () => console.log(`app listening on port ${port}`))