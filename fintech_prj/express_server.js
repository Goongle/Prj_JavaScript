const express = require("express"); // express 모듈 가져옴
const app = express(); // app 형태로 객체 반환
const path = require("path"); // 경로를 가져오기 위한 객체
const request = require("request"); // request 
var jwt = require("jsonwebtoken"); // jsonwebtoken을 위한 jwt 라이브러리를 받음
var tokenKey = "k!2f#$%%^1223^jlfejlkjfdaskejlkjflkj";
var auth = require("./lib/auth"); // 미들웨어 추가

// DB Connection 추가
var mysql = require("mysql");
var connection = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "password", 
  database: "kisa",
}); // 자신의 Database 연결
connection.connect(); // connect

app.set("views", __dirname + "/views"); //ejs 를 사용하기위한 디렉토리 설정 __dirname : 현재 사용중인 디렉터리
app.set("view engine", "ejs"); //ejs 를 사용하기위한 뷰 엔진 설정

app.use(express.json()); // JSON 타입의 데이터를 받기위한 설정
app.use(express.urlencoded({ extended: false })); // urlencoded 타입의 데이터를 받기위한 설정

app.use(express.static(path.join(__dirname, "public")));
//to use static asset 디자인 파일 위치를 정의

app.get("/", function (req, res) {
  res.send("안녕하세요.");
}); // Root 페이지 설정

app.get("/signup", function (req, res) {
  res.render("signup");
}); // 회원 가입 설정

app.get("/login", function (req, res) {
  res.render("login");
}); // Login 설정

app.get("/main", function (req, res) {
  res.render("main");
}); // main 화면 설정

app.get("/balance", function (req, res) {
  res.render("balance");
}); // 계좌 정보 조회 설정

app.get("/qrcode", function (req, res) {
  res.render("qrcode");
}); // QR 코드 생성 설정

app.get("/authResult", function (req, res) {
  var authCode = req.query.code;

  var option = {
    method: "POST",
    url: "https://testapi.openbanking.or.kr/oauth/2.0/token",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json ***
    form: {
      code: authCode,
      client_id: "q7kH44ThJwjpvNRg0BbJvE1yxvx5X53DKz1rNgPF",
      client_secret: "yVT6irMr2h4ZTHzZY7sDpbvhm1nlOzr4nP7DYRVy",
      redirect_uri: "http://localhost:3000/authResult",
      grant_type: "authorization_code",
      //#자기 키로 시크릿 변경
    },
  };

  request(option, function (error, response, body) {
    var accessRequestResult = JSON.parse(body); //JSON 오브젝트를 JS 오브젝트로 변경
    console.log(accessRequestResult);
    res.render("resultChild", { data: accessRequestResult });
  });
});

app.post("/signup", function (req, res) {
  var userName = req.body.userName;
  var userEmail = req.body.userEmail;
  var userPassword = req.body.userPassword;
  var userAccessToken = req.body.userAccessToken; // 여기부터 userSeqNo까지는 자동적으로 생성
  var userRefreshToken = req.body.userRefreshToken;
  var userSeqNo = req.body.userSeqNo; 
  console.log(userName, userEmail, userPassword);
  connection.query(
    "INSERT INTO `user`(`name`,`email`,`password`,`accesstoken`,`refreshtoken`,`userseqno`)VALUES(?,?,?,?,?,?);",
    [
      userName,
      userEmail,
      userPassword,
      userAccessToken,
      userRefreshToken,
      userSeqNo,
    ],
    function (error, results, fields) {
      if (error) throw error;
      else {
        res.json(1); // Conn 내 insert Query 수행 시 에러 발생하면 Json(1) 반환
      }
    }
  );
});

app.post("/login", function (req, res) {
  var userEmail = req.body.userEmail;
  var userPassword = req.body.userPassword;
  console.log(userEmail, userPassword);
  connection.query("SELECT * FROM user WHERE email = ?", [userEmail], function (
    error,
    results,
    fields
  ) {
    if (error) throw error;
    else {
      if (results.length == 0) {
        res.json(2); // 아이디 존재하지 않음
      } else {
        var storedPassword = results[0].password;
        if (storedPassword == userPassword) {
          jwt.sign(
            {
              userId: results[0].id,
              userEmail: results[0].email,
            },
            tokenKey,
            {
              expiresIn: "1d",
              issuer: "fintech.admin",
              subject: "user.login.info",
            },
            function (err, token) {
              console.log("로그인 성공", token);
              res.json(token); // 여기서 res.json으로 응답을 보내주어야 Success가 될 수 있음
            }
          );
        } else {
          res.json("로그인 실패");
        }
      }
    }
  });
});
/* 위의 jwt.sign 메서드를 통해서 Cookie를 생성한 후 사용자에게 전달한다. 
   첫 파라미터에는 id 및 email이 들어간다.
   두 번째 파라미터는 tokenKey 즉, 비밀키가 들어간다.
   세 번째 파라미터에는 토근에 대한 정보를 제공 -> expiresIn은 만료 시간을 의미
   해당 함수를 실행하면 Session으로 들어가게 된다.
*/
app.post("/list", auth, function (req, res) {
  //https://testapi.openbanking.or.kr/v2.0/user/me url 에 Request 요청하기
  var userId = req.decoded.userId;

  connection.query("SELECT * FROM user WHERE id = ?", [userId], function (
    error,
    results
  ) {
    if (error) throw error;
    else {
      var option = {
        method: "GET",
        url: "https://testapi.openbanking.or.kr/v2.0/user/me",
        headers: {
          Authorization: "Bearer " + results[0].accesstoken,
        },
        //accesstoken 입력
        //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json ***
        qs: {
          user_seq_no: results[0].userseqno,
          //#자기 키로 시크릿 변경
        },
      };
      request(option, function (err, response, body) {
        var resResult = JSON.parse(body);
        console.log(resResult);
        //json 문서를 파싱하여 javascript 오브젝트로 변환
        res.json(resResult);
      });
    }
  });
});

app.post("/balance", auth, function (req, res) {
  var userId = req.decoded.userId;
  var finusenum = req.body.fin_use_num;
  var countnum = Math.floor(Math.random() * 1000000000) + 1; // 임의적으로 숫자 부여 이렇게 하면 안됌
  var transId = "T991599190U" + countnum; //이용기관번호 본인것 입력

  //사용자 정보를 바탕으로 request 요청을 만들기 url https://testapi.openbanking.or.kr/v2.0/account/balance/fin_num
  connection.query("SELECT * FROM user WHERE id = ?", [userId], function (
    error,
    results
  ) {
    if (error) throw error;
    else {
      var option = {
        method: "GET",
        url: "https://testapi.openbanking.or.kr/v2.0/account/balance/fin_num",
        headers: {
          Authorization: "Bearer " + results[0].accesstoken,
        },
        //accesstoken 입력
        //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json ***
        qs: {
          bank_tran_id: transId,
          fintech_use_num: finusenum,
          tran_dtime: "20200924143600",
          //#자기 키로 시크릿 변경
        },
      };
      request(option, function (err, response, body) {
        var resResult = JSON.parse(body);
        console.log(resResult);
        //json 문서를 파싱하여 javascript 오브젝트로 변환
        res.json(resResult);
      });
    }
  });
});

app.post("/transactionlist", auth, function (req, res) {
  var userId = req.decoded.userId;
  var finusenum = req.body.fin_use_num;
  var countnum = Math.floor(Math.random() * 1000000000) + 1;
  var transId = "T991599190U" + countnum; //이용기관번호 본인것 입력
  connection.query("SELECT * FROM user WHERE id = ?", [userId], function (
    error,
    results
  ) {
    if (error) throw error;
    else {
      var option = {
        method: "GET",
        url:
          "https://testapi.openbanking.or.kr/v2.0/account/transaction_list/fin_num",
        headers: {
          Authorization: "Bearer " + results[0].accesstoken,
        },
        //accesstoken 입력
        //form 형태는 form / 쿼리스트링 형태는 qs / json 형태는 json ***
        qs: {
          bank_tran_id: transId,
          fintech_use_num: finusenum,
          inquiry_type: "A",
          inquiry_base: "D",
          from_date: "20190101",
          to_date: "20190101",
          sort_order: "D",
          tran_dtime: "20200924163300",
        },
      };
      request(option, function (err, response, body) {
        var resResult = JSON.parse(body);
        console.log(resResult);
        //json 문서를 파싱하여 javascript 오브젝트로 변환
        res.json(resResult);
      });
    }
  });
});
app.listen(3000);
