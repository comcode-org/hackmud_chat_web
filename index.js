const express = require('express')
const sass = require('node-sass')
const sassMiddleware = require('node-sass-middleware')
const eyeglass = require("eyeglass");

const app = express()
const port = 1337
const debug = true
const proxy = debug

app.use(
  sassMiddleware(
    eyeglass({
      src: __dirname, //where the sass files are
      dest: __dirname, //where css should go
      debug: debug, // obvious
    })
  )
)

app.use(express.static('./'))

if (proxy) {
  const { createProxyMiddleware } = require("http-proxy-middleware");
  app.use('/mobile/', createProxyMiddleware({target:"https://www.hackmud.com/",changeOrigin:true,logLevel:"debug"}))
}

app.get('/', (req, res) => res.static('index'))

app.listen(port, () => console.log(`app listening on port ${port}`))
