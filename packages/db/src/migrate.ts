import { getDb, seedDemoData } from "./index";

const database = getDb();
seedDemoData();
database.close();

console.log("SQLite schema ready at .data/hearth.sqlite");