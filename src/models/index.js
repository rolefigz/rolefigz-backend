const sequelize        = require("../config/db");
const Usuario          = require("./Usuario");
const Categoria        = require("./Categoria");
const Producto         = require("./Producto");
const Orden            = require("./Orden");
const DetalleOrden     = require("./DetalleOrden");
const VarianteProducto = require("./VarianteProducto");
const ImagenProducto   = require("./ImagenProducto");
const Resena           = require("./Resena");

module.exports = { sequelize, Usuario, Categoria, Producto, Orden, DetalleOrden, VarianteProducto, ImagenProducto, Resena };
