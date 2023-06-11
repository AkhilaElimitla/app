const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");

const databasePath = path.join(__dirname, "covid19India.db");

const app = express();

app.use(express.json());

let database = null;

const initializeDbAndServer = async () => {
  try {
    database = await open({
      filename: databasePath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () =>
      console.log("Server Running at http://localhost:3000/")
    );
  } catch (error) {
    console.log(`DB Error: ${error.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();

let convertStateObjectToResponse = (each) => {
  return {
    stateId: each.state_id,
    stateName: each.state_name,
    population: each.population,
  };
};

let convertDistrictObjectToResponse = (result) => {
  return {
    districtId: result.district_id,
    districtName: result.district_name,
    stateId: result.state_id,
    cases: result.cases,
    cured: result.cured,
    active: result.active,
    deaths: result.deaths,
  };
};

app.get("/states/", async (request, response) => {
  let getQuery = `select * from state`;
  let result = await database.all(getQuery);
  response.send(result.map((each) => convertStateObjectToResponse(each)));
});

app.get("/states/:stateId/", async (request, response) => {
  let { stateId } = request.params;
  let getQuery = `select * from state where state_id=${stateId}`;
  let result = await database.get(getQuery);
  response.send(convertStateObjectToResponse(result));
});

app.post("/districts/", async (request, response) => {
  let details = request.body;
  let { districtName, stateId, cases, cured, active, deaths } = details;
  let getQuery = `insert into district(district_name,state_id,cases,cured,active,deaths) values('${districtName}',${stateId},${cases},${cured},${active},${deaths})`;
  let res = await database.run(getQuery);
  const districtId = res.lastId;
  response.send("District Successfully Added");
});

app.get("/districts/:districtId/", async (request, response) => {
  let { districtId } = request.params;
  let getQuery = `select * from district where district_id=${districtId}`;
  let result = await database.get(getQuery);
  response.send(convertDistrictObjectToResponse(result));
});

app.delete("/districts/:districtId/", async (request, response) => {
  let { districtId } = request.params;
  let getQuery = `delete from district where district_id=${districtId}`;
  await database.run(getQuery);
  response.send("District Removed");
});

app.put("/districts/:districtId/", async (request, response) => {
  let { districtId } = request.params;
  let details = request.body;
  let { districtName, stateId, cases, cured, active, deaths } = details;
  let getQuery = `update district set district_name='${districtName}',state_id=${stateId},cases=${cases},cured=${cured},
    active=${active},deaths=${deaths} where district_id=${districtId}`;
  await database.run(getQuery);
  response.send("District Details Updated");
});

app.get("/states/:stateId/stats/", async (request, response) => {
  let { stateId } = request.params;
  let getQuery = `select sum(cases) as cases,sum(cured) as cured,sum(active) as active,sum(deaths) as deaths from district where state_id=${stateId} `;
  let res = await database.get(getQuery);
  console.log(res);
  response.send({
    totalCases: res["cases"],
    totalCured: res["cured"],
    totalActive: res["active"],
    totalDeaths: res["deaths"],
  });
});

app.get("/districts/:districtId/details/", async (request, response) => {
  let { districtId } = request.params;
  let getQuery = `select state_name from state inner join district on district_id=${districtId}`;
  let result = await database.get(getQuery);
  response.send({ stateName: result.state_name });
});

module.exports = app;
