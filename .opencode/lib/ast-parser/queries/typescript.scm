; Tree-sitter queries for TypeScript/TSX

; Class declarations with decorators
(class_declaration
  name: (identifier) @class.name
  (class_body
    (method_definition
      name: (property_identifier) @constructor.name
      (#eq? @constructor.name "constructor")) @constructor)
  (class_body) @class.body) @class.definition

; Decorators
(decorator
  (identifier) @decorator.name) @decorator

; Method definitions
(method_definition
  (accessibility_modifier) @method.modifier
  name: (property_identifier) @method.name
  parameters: (formal_parameters) @method.params
  return_type: (type_annotation)? @method.return_type) @method.definition

; Function declarations
(function_declaration
  name: (identifier) @function.name
  parameters: (formal_parameters) @function.params
  return_type: (type_annotation)? @function.return_type) @function.definition

; Arrow functions assigned to variables
(variable_declarator
  name: (identifier) @function.name
  value: (arrow_function) @function.body) @arrow_function

; Interface declarations
(interface_declaration
  name: (type_identifier) @interface.name
  (object_type) @interface.body) @interface.definition

; Type alias declarations
(type_alias_declaration
  name: (type_identifier) @type.name) @type.definition

; Enum declarations
(enum_declaration
  name: (identifier) @enum.name
  (enum_body) @enum.body) @enum.definition

; Import statements
(import_statement
  source: (string) @import.source
  (import_clause)? @import.clause) @import

; Named imports
(import_specifier
  name: (identifier) @import.name
  alias: (identifier)? @import.alias) @import.specifier

; Export statements
(export_statement
  (export_clause)? @export.clause) @export

; Property access (for detecting patterns like @Controller, @Injectable)
(decorator
  (call_expression
    function: (identifier) @decorator.call.name
    arguments: (arguments) @decorator.args)) @decorator.call

; NestJS controller pattern
(class_declaration
  (decorator
    (call_expression
      function: (identifier) @decorator.controller
      (#eq? @decorator.controller "Controller")))
  name: (identifier) @controller.name) @nestjs.controller

; NestJS injectable pattern (services)
(class_declaration
  (decorator
    (call_expression
      function: (identifier) @decorator.injectable
      (#eq? @decorator.injectable "Injectable")))
  name: (identifier) @service.name) @nestjs.service

; NestJS module pattern
(class_declaration
  (decorator
    (call_expression
      function: (identifier) @decorator.module
      (#eq? @decorator.module "Module")))
  name: (identifier) @module.name) @nestjs.module

; Route handler decorators
(method_definition
  (decorator
    (call_expression
      function: (identifier) @route.method
      (#match? @route.method "^(Get|Post|Put|Patch|Delete)$")))
  (decorator
  	(call_expression
      function: (identifier) @route.guard
      (#eq? @route.guard "UseGuards")))
  name: (property_identifier) @route.handler) @nestjs.route

; React component pattern (PascalCase function)
(function_declaration
  name: (identifier) @component.name
  (#match? @component.name "^[A-Z]")) @react.component

; React hook usage
(call_expression
  function: (identifier) @hook.name
  (#match? @hook.name "^use[A-Z]")) @react.hook

; Generic type instantiation
(generic_type
  name: (identifier) @generic.name
  type_arguments: (type_arguments) @generic.args) @generic.type

; Type annotation
(type_annotation
  (type_identifier) @type.ref) @annotation

; Property signature (in interfaces)
(property_signature
  name: (property_identifier) @property.name
  type: (type_annotation)? @property.type) @property

; Required parameter
(required_parameter
  name: (identifier) @param.name
  type: (type_annotation)? @param.type) @param.required

; Optional parameter
(optional_parameter
  name: (identifier) @param.name
  type: (type_annotation)? @param.type) @param.optional

; Return statement
(return_statement
  (identifier)? @return.value) @return

; Try-catch blocks (for error handling patterns)
(try_statement
  body: (statement_block) @try.body
  handler: (catch_clause) @catch.handler) @try.catch

; Await expression (for async patterns)
(await_expression
  (identifier) @await.target) @await

; Promise handling
(member_expression
  object: (call_expression
    function: (identifier) @promise.call)
  property: (property_identifier) @promise.method
  (#match? @promise.method "^(then|catch|finally)$")) @promise.chain
