; Tree-sitter queries for SQL and Prisma

; Prisma model definition
(model_declaration
  name: (identifier) @model.name
  body: (model_body) @model.body) @prisma.model

; Prisma field
(field_declaration
  name: (identifier) @field.name
  type: (type_reference) @field.type) @prisma.field

; Prisma relation
(field_declaration
  name: (identifier) @field.name
  type: (type_reference) @field.type
  (attribute
    name: (identifier) @attr.name
    (#eq? @attr.name "relation"))) @prisma.relation

; Prisma attribute (@id, @unique, @default)
(attribute
  name: (identifier) @attribute.name
  arguments: (attribute_arguments)? @attribute.args) @prisma.attribute

; Prisma block attribute (@@index, @@unique, @@id)
(block_attribute
  name: (identifier) @block_attr.name
  arguments: (attribute_arguments)? @block_attr.args) @prisma.block_attribute

; Prisma enum
(enum_declaration
  name: (identifier) @enum.name
  body: (enum_body) @enum.body) @prisma.enum

; Prisma enum value
(enum_value
  name: (identifier) @enum_value.name) @prisma.enum_value

; SQL CREATE TABLE
(create_table_statement
  name: (identifier) @table.name) @sql.create_table

; SQL column definition
(column_definition
  name: (identifier) @column.name
  type: (data_type) @column.type) @sql.column

; SQL primary key
(primary_key_constraint
  columns: (column_list) @pk.columns) @sql.primary_key

; SQL foreign key
(foreign_key_constraint
  columns: (column_list) @fk.columns
  references: (references_clause
    table: (identifier) @fk.ref_table
    columns: (column_list) @fk.ref_columns)) @sql.foreign_key

; SQL index
(create_index_statement
  name: (identifier) @index.name
  table: (identifier) @index.table
  columns: (column_list) @index.columns) @sql.index

; SQL SELECT
(select_statement
  columns: (select_expression) @select.columns
  from: (from_clause
    table: (identifier) @select.table)) @sql.select

; SQL INSERT
(insert_statement
  table: (identifier) @insert.table
  columns: (column_list) @insert.columns) @sql.insert

; SQL UPDATE
(update_statement
  table: (identifier) @update.table
  assignments: (assignment_list) @update.assignments) @sql.update

; SQL DELETE
(delete_statement
  from: (from_clause
    table: (identifier) @delete.table)) @sql.delete

; SQL JOIN
(join_clause
  type: (join_type) @join.type
  table: (identifier) @join.table
  on: (join_condition) @join.on) @sql.join

; SQL WHERE
(where_clause
  expression: (expression) @where.expr) @sql.where

; SQL ORDER BY
(order_by_clause
  columns: (order_by_expression_list) @order_by.columns) @sql.order_by

; SQL GROUP BY
(group_by_clause
  columns: (column_list) @group_by.columns) @sql.group_by

; SQL HAVING
(having_clause
  expression: (expression) @having.expr) @sql.having

; Prisma @default with autoincrement
(attribute
  name: (identifier) @attr.name
  (#eq? @attr.name "default")
  arguments: (attribute_arguments
    (function_call
      name: (identifier) @function.name
      (#eq? @function.name "autoincrement")))) @prisma.autoincrement

; Prisma @default with uuid
(attribute
  name: (identifier) @attr.name
  (#eq? @attr.name "default")
  arguments: (attribute_arguments
    (function_call
      name: (identifier) @function.name
      (#eq? @function.name "uuid")))) @prisma.uuid_default

; Prisma @@index block attribute
(block_attribute
  name: (identifier) @attr.name
  (#eq? @attr.name "index")
  arguments: (attribute_arguments
    (array_expression) @index.fields)) @prisma.index

; Prisma @@unique block attribute
(block_attribute
  name: (identifier) @attr.name
  (#eq? @attr.name "unique")
  arguments: (attribute_arguments
    (array_expression) @unique.fields)) @prisma.unique
