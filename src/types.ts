import { W } from "mongodb";

export interface Album {
  id: String;
  title: String;
  artists: Array<String>;
  coverUrl: String;
  releaseDate: String;
}

export interface ListItem {
  index: Number;
  albumID: String;
  description?: String;
  rating?: Number;
  addedOn?: String;
}

export interface List {
  id: String;
  name: String;
  createdOn: String;
  items?: Array<ListItem>;
}

export interface User {
  uuid: String;
  name: String;
  pass: String;
  toListen?: List;
  currentListen?: List;
  finishedListen?: List;
}
