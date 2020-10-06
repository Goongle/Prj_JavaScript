var http = require("http");
const request = require("request");
var parseString = require("xml2js").parseString;
http
  .createServer(function (req, res) {
    console.log("요청이 들어왔습니다.");
    request("https://naver.com", function (error, response, body) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(body);
    });
  })
  .listen(3000);

//127.0.0.1:3000 < nodejs http server
//127.0.0.1:3306 < mysql
