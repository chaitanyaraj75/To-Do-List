import express from "express";
import bodyParser from "body-parser";
import pg from 'pg';
import session from "express-session";
import passport from "passport";
import { Strategy } from "passport-local";
import env from "dotenv";
import pgSession from 'connect-pg-simple';
const pgStore = pgSession(session);

env.config();
// const PG_USER = process.env.PG_USER;
// const PG_HOST = process.env.PG_HOST;
// const PG_DATABASE = process.env.PG_DATABASE;
// const PG_PASSWORD = process.env.PG_PASSWORD;
// const PG_PORT = process.env.PG_PORT;

const app = express();
const port = process.env.PORT || 3000;


const db = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

db.connect();

app.use(
  session({
    store: new pgStore({
      pool: db,
      createTableIfMissing: true,
    }),
    secret: "TOPSECRET",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 }
  })
);

app.use(passport.initialize());
app.use(passport.session());

// const db = new pg.Client({
//   user: process.env.PG_USER,
//   host: process.env.PG_HOST,
//   database: process.env.PG_DATABASE,
//   password: process.env.PG_PASSWORD,
//   port: process.env.PG_PORT,
// });


app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static("public"));

let items = [];

//Active user detail
var user = "chaitu";
var name = "Chaitanya";


//Login page
app.get("/", (req, res) => {
  res.render("login.ejs");
})

//Register page
app.get("/register", (req, res) => {
  res.render("register.ejs");
})

//Login page
app.get("/login", (req, res) => {
  res.render("login.ejs");
})

//Login Detail
app.post("/login",
  passport.authenticate("local", {
    successRedirect: "/todolist",
    failureRedirect: "/login",
  })
);

//Register Detail
app.post("/register", async (req, res) => {
  const currusername = req.body.username;
  const currname = req.body.name;
  const currpassword = req.body.password;
  try {
    const result = await db.query(
      "INSERT INTO users(name,username,password) VALUES ($1,$2,$3) RETURNING *;",
      [currname, currusername, currpassword]
    )
    name = currname;
    user = currusername;
    res.redirect("/todolist");
  } catch (error) {
    console.log("Not unique username");
  }
})

//To-Do-List Page
app.get("/todolist", async (req, res) => {
  if (!req.isAuthenticated()) {
    res.redirect("/login");
  }
  else {
    const result = await db.query(
      "SELECT * FROM notes WHERE username=($1) ORDER BY time ASC;",
      [user]
    );
    items = result.rows;
    // console.log((items[0].time));
    res.render("todolist.ejs", {
      listTitle: name,
      listItems: items,
    });
  }

});


//Post request to add item
app.post("/add", async (req, res) => {
  const title = req.body.newItem;
  if (title.length === 0) {
    res.redirect("/todolist");
  }
  else {
    const result = await db.query(
      "INSERT INTO notes(username,title) VALUES ($1,$2) RETURNING *;",
      [user, title]
    );
    items = result.rows;
    res.redirect("/todolist");
  }

});

//Post request to edit the item
app.post("/edit", async (req, res) => {
  const editid = req.body.updatedItemId;
  const edittext = req.body.updatedItemTitle;
  const result = await db.query(
    "UPDATE notes SET title=$1 WHERE id=$2 RETURNING *",
    [edittext, editid]
  );
  items = result.rows;
  res.redirect("/todolist");
});

app.post("/delete", async (req, res) => {
  const deleteid = req.body.deleteItemId;
  const result = await db.query("DELETE FROM notes WHERE id=$1;", [deleteid]);
  items = result.rows;
  res.redirect("/todolist");
});

//Logout Page
app.get('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).send('Error logging out');
        }
        res.redirect('/login');
    });
});


//Verification,Session and Cookies
passport.use(
  new Strategy(async function verify(username, password, cb) {
    try {
      const result = await db.query("SELECT * FROM users WHERE username = $1 ", [
        username,
      ]);
      if (result.rows.length > 0) {
        const alluser = result.rows[0];
        const storedPassword = alluser.password;
        if(storedPassword==password){
          user=username
          name=alluser.name
          return cb(null,true);
        }
        else return cb(null,false);
      } else {
        return cb(null,false);
      }
    } catch (err) {
      console.log(err);
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});
passport.deserializeUser((user, cb) => {
  cb(null, user);
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
