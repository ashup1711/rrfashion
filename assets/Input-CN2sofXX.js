import{r as m,j as t}from"./index-D-dCmKQw.js";const n=m.forwardRef(({label:e,error:r,helperText:d,className:a="",id:o,...i},c)=>{const s=o||(e==null?void 0:e.toLowerCase().replace(/\s+/g,"-"));return t.jsxs("div",{className:"w-full",children:[e&&t.jsx("label",{htmlFor:s,className:"block text-sm font-medium text-gray-700 mb-1",children:e}),t.jsx("input",{ref:c,id:s,className:`
            block w-full rounded-md border px-3 py-2 text-sm shadow-sm
            placeholder:text-gray-400
            focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500
            disabled:bg-gray-50 disabled:text-gray-500
            ${r?"border-red-500 focus:ring-red-500 focus:border-red-500":"border-gray-300"}
            ${a}
          `,"aria-invalid":r?"true":"false","aria-describedby":r?`${s}-error`:d?`${s}-helper`:void 0,...i}),r&&t.jsx("p",{id:`${s}-error`,className:"mt-1 text-sm text-red-600",role:"alert",children:r}),d&&!r&&t.jsx("p",{id:`${s}-helper`,className:"mt-1 text-sm text-gray-500",children:d})]})});n.displayName="Input";export{n as I};
