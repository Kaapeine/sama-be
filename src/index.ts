import express, { Request, Response } from "express";
import cors from "cors";
import axios from "axios";
import { Album } from "./types.js";
import { MongoClient } from "mongodb";

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

app.get("/search", (req: Request, res: Response) => {
  const query: any = req.query.q;

  const getReleaseGroups = async () => {
    try {
      const resp = await mbDb.get("release-group", {
        params: {
          query: "releasegroup:" + query + "AND%primarytype:Album%",
          limit: 10,
        },
      });
      if (resp.status === 200) {
        const data: any = {
          albums: [],
        };
        resp.data["release-groups"].map((item: any) => {
          if (item["primary-type"] == "Album")
            data.albums.push({
              id: item.id,
              title: item.title,
              artists: item["artist-credit"],
            });
        });
        res.status(200).json(data);
      }
    } catch (error) {
      console.log(error);
      res.send("Error");
    }
  };

  getReleaseGroups();
});

app.put("/add-to-listen", (req: Request, res: Response) => {
  const albumId: string = req.body.albumId;
  const userId: string = req.body.userId;

  const updateUser = async () => {
    await users.updateOne(
      { id: userId },
      {
        $addToSet: {
          "to-listen": albumId,
        },
      }
    );
    console.log("Adding", albumId, await users.findOne({ id: "0" }));
    res.status(200).json("Success!");
  };

  updateUser();
});

app.get("/to-listen", (req: Request, res: Response) => {
  const userId: any = req.query.uid;

  const getToListen = async () => {
    const user = await users.findOne({ id: userId });
    if (user) {
      const toListen = user["to-listen"];

      const toListenAlbums: Array<Album> = [];
      await Promise.all(
        toListen.map(async (albumId: string) => {
          const album = await getAlbumInfo(albumId);
          album.coverUrl = await getCoverArt(albumId);
          toListenAlbums.push(album);
        })
      );
      res.status(200).json({
        toListen: toListenAlbums,
      });
    } else {
      res.status(404).send("User not found");
    }
  };

  getToListen();
});

async function getAlbumInfo(id: string) {
  let album: Album;

  try {
    const res = await mbDb.get(`/release-group/${id}?inc=artists`);
    if (res.status == 200) {
      album = {
        id: res.data.id,
        title: res.data.title,
        artists: res.data["artist-credit"].map((item: any) => item.name),
        releaseDate: res.data["first-release-date"],
        coverUrl: "",
      };
      return album;
    } else {
      return null;
    }
  } catch (error: any) {
    console.log(error);
    return error;
  }
}

async function getCoverArt(id: string) {
  try {
    const res = await axios.get(
      `http://coverartarchive.org/release-group/${id}`
    );
    if (res.status === 200) {
      return res.data.images[0].thumbnails["small"];
    } else {
      return null;
    }
  } catch (error) {
    return null;
  }
}

async function main() {
  console.log("App init");
  console.log(await users.findOne({ id: "0" }));
}
