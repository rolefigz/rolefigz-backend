const sequelize        = require("../config/db");
const Usuario          = require("./Usuario");
const Categoria        = require("./Categoria");
const Producto         = require("./Producto");
const Orden            = require("./Orden");
const DetalleOrden     = require("./DetalleOrden");
const VarianteProducto = require("./VarianteProducto");
const ImagenProducto   = require("./ImagenProducto");
const Resena           = require("./Resena");
const Articolo         = require("./Articolo");
const Visita           = require("./Visita");
const Ticket           = require("./Ticket");
const Mensaje          = require("./Mensaje");

module.exports = { sequelize, Usuario, Categoria, Producto, Orden, DetalleOrden, VarianteProducto, ImagenProducto, Resena, Articolo, Visita, Ticket, Mensaje };
