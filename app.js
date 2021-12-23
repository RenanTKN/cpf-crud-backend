const express = require("express");
const { Sequelize } = require("sequelize");
const cors = require("cors");

require("dotenv").config();

const { DB_HOST, DB_NAME, DB_USER, DB_PASS } = process.env;
const PORT = 5000;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASS, {
  host: DB_HOST,
  dialect: "mysql",
});

const validateCpf = (cpf) => cpf.length === 11;
const validateDate = (date) => date.match(/^\d+-\d+-\d+$/i);
const convertDateTimeZone = (date) => {
  const [y, m, d] = date.split("-");
  return `${y}-${m}-${+d + 1}`;
};

const assertDatabaseConnectionOk = async () => {
  console.log(`Checking database connection...`);
  try {
    await sequelize.authenticate();
    await sequelize.query(`CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\`;`);
    console.log("Database connection OK!");
  } catch (error) {
    console.log("Unable to connect to the database:");
    console.log(error.message);
    process.exit(1);
  }
};

const init = async () => {
  assertDatabaseConnectionOk();

  const Usuario = sequelize.define("usuario", {
    cpf: {
      type: Sequelize.STRING(11),
      primaryKey: true,
      unique: true,
      allowNull: false,
    },
    nome: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    telefone: {
      type: Sequelize.STRING,
      allowNull: false,
    },
    dataNascimento: {
      type: Sequelize.DATE,
      allowNull: false,
    },
  });

  const server = express();

  server.use(cors());
  server.use(express.json());

  server.get("/pessoas", (_, res) =>
    sequelize.sync().then(() => {
      Usuario.findAll().then((users) => {
        res.json(users);
      });
    })
  );

  server.get("/pessoas/:cpf", async (req, res) => {
    const { cpf } = req.params;

    return sequelize.sync().then(() => {
      Usuario.findByPk(cpf).then((user) => {
        res.json(user);
      });
    });
  });

  server.post("/pessoas", async (req, res) => {
    const { cpf, nome, telefone, dataNascimento } = req.body;

    if (!validateCpf(cpf)) {
      return res.status(400).json({ message: "CPF inválido" });
    }
    if (!nome) {
      return res.status(400).json({ message: "Nome inválido" });
    }
    if (!telefone) {
      return res.status(400).json({ message: "Telefone inválido" });
    }
    if (!validateDate(dataNascimento)) {
      return res.status(400).json({ message: "Data de nascimento inválida" });
    }

    const createdUser = await sequelize.sync().then(() => {
      Usuario.create({
        cpf,
        nome,
        telefone,
        dataNascimento,
      });
    });

    return res.json(createdUser);
  });

  server.put("/pessoas/:cpf", async (req, res) => {
    const { cpf } = req.params;
    const { nome, telefone, dataNascimento } = req.body;

    if (!nome) {
      return res.status(400).json({ message: "Nome inválido" });
    }
    if (!telefone) {
      return res.status(400).json({ message: "Telefone inválido" });
    }
    if (!validateDate(dataNascimento)) {
      return res.status(400).json({ message: "Data de nascimento inválida" });
    }

    offsetDate = convertDateTimeZone(dataNascimento);

    const editedUser = await sequelize
      .sync()
      .then(() =>
        Usuario.update(
          { nome, telefone, dataNascimento: offsetDate },
          { where: { cpf } }
        )
      );

    return res.json(editedUser);
  });

  server.delete("/pessoas/:cpf", async (req, res) => {
    const { cpf } = req.params;

    const removeUser = await sequelize
      .sync()
      .then(() => Usuario.destroy({ where: { cpf } }));
    return res.json(removeUser);
  });

  server.listen(process.env.PORT || PORT);
};

init();
