; Tree-sitter queries for JSON

; JSON object
(object
  (pair)*) @json.object

; JSON pair (key-value)
(pair
  key: (string) @json.key
  value: (_) @json.value) @json.pair

; JSON array
(array
  (element)*) @json.array

; JSON string value
(string) @json.string

; JSON number value
(number) @json.number

; JSON boolean values
(true) @json.boolean.true
(false) @json.boolean.false

; JSON null value
(null) @json.null

; package.json specific patterns
; Dependencies
(pair
  key: (string) @dep_key
  (#match? @dep_key "\"(dependencies|devDependencies|peerDependencies|optionalDependencies)\"")
  value: (object
    (pair
      key: (string) @package.name
      value: (string) @package.version) @package.entry)) @dependencies

; Scripts section
(pair
  key: (string) @scripts_key
  (#eq? @scripts_key "\"scripts\"")
  value: (object
    (pair
      key: (string) @script.name
      value: (string) @script.command) @script.entry)) @scripts

; name field
(pair
  key: (string) @name_key
  (#eq? @name_key "\"name\"")
  value: (string) @package.name.value) @package.name

; version field
(pair
  key: (string) @version_key
  (#eq? @version_key "\"version\"")
  value: (string) @package.version.value) @package.version

; main field
(pair
  key: (string) @main_key
  (#eq? @main_key "\"main\"")
  value: (string) @package.main.value) @package.main

; module field
(pair
  key: (string) @module_key
  (#eq? @module_key "\"module\"")
  value: (string) @package.module.value) @package.module

; types field
(pair
  key: (string) @types_key
  (#eq? @types_key "\"types\"")
  value: (string) @package.types.value) @package.types

; exports field
(pair
  key: (string) @exports_key
  (#eq? @exports_key "\"exports\"")
  value: (_) @package.exports.value) @package.exports

; tsconfig.json specific patterns
; compilerOptions
(pair
  key: (string) @compiler_options_key
  (#eq? @compiler_options_key "\"compilerOptions\"")
  value: (object
    (pair
      key: (string) @option.name
      value: (_) @option.value) @compiler.option.entry)) @compiler_options

; target
(pair
  key: (string) @target_key
  (#eq? @target_key "\"target\"")
  value: (string) @tsconfig.target.value) @tsconfig.target

; module
(pair
  key: (string) @module_key
  (#eq? @module_key "\"module\"")
  value: (string) @tsconfig.module.value) @tsconfig.module

; strict
(pair
  key: (string) @strict_key
  (#eq? @strict_key "\"strict\"")
  value: (_) @tsconfig.strict.value) @tsconfig.strict

; esModuleInterop
(pair
  key: (string) @interop_key
  (#eq? @interop_key "\"esModuleInterop\"")
  value: (_) @tsconfig.interop.value) @tsconfig.es_module_interop

; outDir
(pair
  key: (string) @outdir_key
  (#eq? @outdir_key "\"outDir\"")
  value: (string) @tsconfig.outdir.value) @tsconfig.out_dir

; rootDir
(pair
  key: (string) @rootdir_key
  (#eq? @rootdir_key "\"rootDir\"")
  value: (string) @tsconfig.rootdir.value) @tsconfig.root_dir

; include
(pair
  key: (string) @include_key
  (#eq? @include_key "\"include\"")
  value: (array
    (string) @include.path) @include.array) @tsconfig.include

; exclude
(pair
  key: (string) @exclude_key
  (#eq? @exclude_key "\"exclude\"")
  value: (array
    (string) @exclude.path) @exclude.array) @tsconfig.exclude

; extends
(pair
  key: (string) @extends_key
  (#eq? @extends_key "\"extends\"")
  value: (string) @tsconfig.extends.value) @tsconfig.extends
