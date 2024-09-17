require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const app = express();
const mongoose = require('mongoose');
const dns = require('node:dns');
// Basic Configuration
const port = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.urlencoded())
app.use('/public', express.static(`${process.cwd()}/public`));

//Connecting to the database 
mongoose.connect(process.env.MONGO_URI)
.then(()=> console.log('Database connected'))
.catch(err=> console.log(err));

//urlSchema 
const UrlSchema = mongoose.Schema({
  original_url:{
    type:String,
    required:true,
    unique:true,
  },
  short_url:{
    type:String,
    required:true,
    unique:true,
  }
})

const UrlModel = mongoose.model('shortUrls',UrlSchema);

app.get('/', function(req, res) {
  res.sendFile(process.cwd() + '/views/index.html');
});

// Your first API endpoint
app.post('/api/shorturl', (req, res) =>{
  let url = req.body.url;

  try{
    let urlObj = new URL(url);
    //check if url is valid 
    dns.lookup(urlObj.hostname,(err,address, family)=>{
      if(err || !address){
        return res.status(404).json({error:'Invalid Url'})
      }
      else{
        let original_url = urlObj.href;
        //check if data exist in the database 
        UrlModel.findOne({original_url:original_url})
        .then(urlFound=>{
          if(urlFound){
            return res.json({
              original_url:original_url,
              short_url:urlFound.short_url
            })
          }
          UrlModel.find({})
          .sort({short_url:'desc'})
          .limit(1)
          .then(latestUrl=>{
            let short_url=0;
            if(latestUrl.length>0){
              short_url = parseInt(latestUrl[0].short_url)+1;
            }
            const resObj={
              original_url:original_url,
              short_url:short_url,
            };

            const newUrl = new UrlModel(resObj);
            newUrl.save()
            .then(()=>{
              res.json(resObj)
            })
          })
        })
      }
    })
  }
  catch{
    res.json({error:'invalid url'})
  }
});


app.get('/api/shorturl/:shorturl',(req,res)=>{
  let short_url = req.params.shorturl;
  UrlModel.findOne({short_url:short_url})
  .then((foundUrl)=>{
     if(foundUrl){
      const original_url = foundUrl.original_url;
      res.redirect(original_url);
     }else{
      res.json({
        error:'Invalid short url'
      })
     }
  }
  )
})

app.listen(port, function() {
  console.log(`Listening on port ${port}`);
});
