var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
import express from "express";
import cors from "cors";
import axios from "axios";
import { MongoClient } from "mongodb";
import { randomUUID } from "crypto";
const app = express();
app.use(express.urlencoded({ extended: true })); //middleware for parsing urlencoded data
app.use(express.json());
app.use(cors());
const PORT = 4000;
app.listen(PORT, () => main());
const mbDb = axios.create({
    baseURL: "http://localhost:5000/ws/2",
});
const client = new MongoClient("mongodb://localhost:27017");
const users = client.db("sama-db").collection("users");
app.get("/search", (req, res) => {
    const query = req.query.q;
    const getReleaseGroups = () => __awaiter(void 0, void 0, void 0, function* () {
        try {
            const resp = yield mbDb.get("release-group", {
                params: {
                    query: "releasegroup:" + query + "AND%primarytype:Album%",
                    limit: 10,
                },
            });
            if (resp.status === 200) {
                const data = {
                    albums: [],
                };
                resp.data["release-groups"].map((item) => {
                    if (item["primary-type"] == "Album")
                        data.albums.push({
                            id: item.id,
                            title: item.title,
                            artists: item["artist-credit"],
                        });
                });
                res.status(200).json(data);
            }
        }
        catch (error) {
            console.log(error);
            res.send("Error");
        }
    });
    getReleaseGroups();
});
app.put("/add-to-listen", (req, res) => {
    const albumID = req.body.albumID;
    const uuid = req.body.uuid;
    if (!albumID || !uuid) {
        res.status(500).send("Invalid request!");
        return;
    }
    const updateUser = () => __awaiter(void 0, void 0, void 0, function* () {
        yield users.updateOne({ uuid: uuid }, {
            $addToSet: {
                "to-listen": albumID,
            },
        });
        res.status(200).json("Success!");
    });
    updateUser();
});
app.get("/to-listen", (req, res) => {
    const uuid = req.query.uuid;
    const getToListen = () => __awaiter(void 0, void 0, void 0, function* () {
        const user = yield users.findOne({ uuid: uuid });
        if (user) {
            const toListen = user["to-listen"];
            const toListenAlbums = [];
            if (!toListen || toListen.length === 0) {
                res.status(200).json({
                    toListen: [],
                });
            }
            yield Promise.all(toListen.map((albumId) => __awaiter(void 0, void 0, void 0, function* () {
                const album = yield getAlbumInfo(albumId);
                album.coverUrl = yield getCoverArt(albumId);
                toListenAlbums.push(album);
            })));
            res.status(200).json({
                toListen: toListenAlbums,
            });
        }
        else {
            res.status(404).send("User not found");
        }
    });
    getToListen();
});
app.post("/create-user", (req, res) => {
    const name = req.body.name;
    const pass = req.body.pass;
    const uuid = randomUUID();
    if (!name || !pass) {
        res.status(500).send("Details not sent!");
        return;
    }
    const createUser = () => __awaiter(void 0, void 0, void 0, function* () {
        const user = {
            uuid: uuid,
            name: name,
            pass: pass,
        };
        try {
            yield users.insertOne(user);
            res.status(200).send("User created successfully");
        }
        catch (error) {
            console.log(error);
            res.status(500).send("User creation failed");
        }
    });
    createUser();
});
function getAlbumInfo(id) {
    return __awaiter(this, void 0, void 0, function* () {
        let album;
        try {
            const res = yield mbDb.get(`/release-group/${id}?inc=artists`);
            if (res.status == 200) {
                album = {
                    id: res.data.id,
                    title: res.data.title,
                    artists: res.data["artist-credit"].map((item) => item.name),
                    releaseDate: res.data["first-release-date"],
                    coverUrl: "",
                };
                return album;
            }
            else {
                return null;
            }
        }
        catch (error) {
            console.log(error);
            return error;
        }
    });
}
function getCoverArt(id) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const res = yield axios.get(`http://coverartarchive.org/release-group/${id}`);
            if (res.status === 200) {
                return res.data.images[0].thumbnails["small"];
            }
            else {
                return null;
            }
        }
        catch (error) {
            return null;
        }
    });
}
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        console.log("App init");
    });
}
