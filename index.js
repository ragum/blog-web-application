import express from "express";
// import bodyParser from "body-parser";
import multer from "multer";
import { dirname } from "path";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Setup multer untuk upload file
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/')
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname)
    }
});
const upload = multer({ storage: storage });

// Fungsi bantu baca dan tulis data JSON
function readPosts() {
    const data = fs.readFileSync('data.json', 'utf8');
    return JSON.parse(data);
}

async function writePosts(posts) {
    await fs.promises.writeFile('data.json', JSON.stringify(posts, null, 2));
}

const POSTS_PER_PAGE = 3;

app.get("/", (req, res) => {
    const posts = readPosts().sort((a, b) => b.createdAt - a.createdAt); // urut terbaru
    const page = parseInt(req.query.page) || 1;
    const start = (page - 1) * POSTS_PER_PAGE;
    const end = start + POSTS_PER_PAGE;

    const paginatedPosts = posts.slice(start, end);
    const totalPages = Math.ceil(posts.length / POSTS_PER_PAGE);

    res.render("index.ejs", { 
        posts: paginatedPosts,
        currentPage: page,
        totalPages: totalPages, 
        title: "Blog Web Application" });
    console.log(posts);
});

app.get("/create-new", (req, res) => {
    res.render("create-new.ejs", { title: "Create New Post"  });
});

app.post("/submit-new", upload.single('image'), async (req, res) => {
    const posts = readPosts();

    const newPost = {
        id: Date.now(),
        imagePath: req.file ? '/uploads/' + req.file.filename : null,
        title: req.body.title,
        description: req.body.description,
        createdAt: new Date()
    };

    posts.push(newPost);
    await writePosts(posts);

    res.redirect("/");
});

app.get("/edit/:id", (req, res) => {
    const posts = readPosts();
    const post = posts.find(p => p.id == req.params.id);

    if (!post) {
    return res.status(404).send("Post not found");
    }

    res.render("edit-post.ejs", { post: post, title: "Edit Post"  });
});

app.post("/edit/:id", upload.single('image'), (req, res) => {
    const posts = readPosts();
    const postIndex = posts.findIndex(p => p.id == req.params.id);

    if (postIndex === -1) {
    return res.status(404).send("Post not found");
    }

    // Update field
    posts[postIndex].title = req.body.title;
    posts[postIndex].description = req.body.description;

    // Kalau ada upload image baru, replace gambarnya
    if (req.file) {
    posts[postIndex].imagePath = '/uploads/' + req.file.filename;
    }

    writePosts(posts);
    res.redirect("/");
});

app.get("/delete/:id", (req, res) => {
    const posts = readPosts();
    const postIndex = posts.findIndex(p => p.id == req.params.id);

    if (postIndex === -1) {
        return res.status(404).send("Post not found");
    }

    // Hapus gambar dari disk
    if (posts[postIndex].imagePath) {
        const imagePath = path.join(__dirname, 'uploads', posts[postIndex].imagePath.split('/').pop());
        fs.unlinkSync(imagePath);
    }

    // Hapus post dari array
    posts.splice(postIndex, 1);
    writePosts(posts);

    res.redirect("/");
}
);

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});