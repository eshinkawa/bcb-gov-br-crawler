const fs = require("fs");
const app = require("express")();
const json2xls = require("json2xls");
const filename = "sample.xlsx";
const jsdom = require("jsdom");
const { JSDOM } = jsdom;
const axios = require("axios");

app.listen(5050, () => {
  console.log("app is running on port 5050");
  getDataFromBCB();
});

let results = [];

const getDatesRange = () => {
  let listDate = [];
  const startDate = "2019-09-01";
  const endDate = "2019-09-30";
  const dateMove = new Date(startDate);
  let strDate = startDate;

  while (strDate < endDate) {
    strDate = dateMove.toISOString().slice(0, 10);
    listDate.push(strDate);
    dateMove.setDate(dateMove.getDate() + 1);
  }
  return listDate;
};

const convert = async (date, isLastItem) => {
  await axios
    .get(
      `https://www.bcb.gov.br/api/servico/sitebcb/boletimdiario/pordata?data=${date}`
    )
    .then((response) => {
      if (response.data.length === 0) return console.log("Dia vazio");

      const filteredData = response.data.conteudo
        .filter((item) => item.categoria === "Resumo de Decisão")
        .map((item, index) => {
          const dom = new JSDOM(item.conteudo.replace(/&#58/g, ":"));
          let obj = {};
          dom.window.document.querySelectorAll("p").forEach((item, index) => {
            // console.log(item.textContent, index);
            if (item.textContent.includes("ACUSAD") || item.textContent.includes("INDICIADO")) {
              obj.Acusado = item.textContent.includes("ACUSAD") ? item.textContent.substring("ACUSADO:; ".length) : item.textContent.substring("INDICIADO:; ".length);
            }
            if (item.textContent.includes("FUNDAMENTO:; ")) {
              obj.Fundamento = item.textContent.substring(
                "FUNDAMENTO:; ".length
              );
            }
            if (item.textContent.includes("RESULTADO:; ")) {
              obj.Resultado = item.textContent.substring("RESULTADO:; ".length);
            }
          });
          const formattedObj = {
            DataBoletim: item.dataBoletim,
            Processo: item.titulo,
            ...obj,
          };
          return formattedObj;
        });
        
      results = [...results, ...filteredData];
      if(isLastItem){
        generateFile(results);
      }
    })
    .catch((error) => {
      console.log("Erro ao chamar api: ", error);
    });
};

const getDataFromBCB = async () => {
  for (const [index, day] of getDatesRange().entries()) {
    const isLastItem = getDatesRange().length === index + 1;
    await convert(day, isLastItem);
    console.log(`Day: ${day}`);
  }

  console.log('Finished!');
  
};

const generateFile = (data) => {
  const xls = json2xls(data);
  fs.writeFileSync(`data.xlsx`, xls, "binary", (err) => {
    if (err) {
      console.log("writeFileSync :", err);
    }
    console.log(filename + " file is saved!");
  });
};
