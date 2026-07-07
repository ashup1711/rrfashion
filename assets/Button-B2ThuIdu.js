import{j as e}from"./index-BGG754CJ.js";const c={primary:"bg-mauve text-white hover:opacity-90 focus:ring-mauve",secondary:"bg-gray-800 text-white hover:bg-gray-900 focus:ring-gray-500",outline:"border border-gray-300 text-gray-700 hover:bg-gray-50 focus:ring-mauve",ghost:"text-gray-700 hover:bg-gray-100 focus:ring-gray-500",danger:"bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"},l={sm:"px-3 py-1.5 text-sm",md:"px-4 py-2 text-sm",lg:"px-6 py-3 text-base"},d=({variant:t="primary",size:s="md",isLoading:r=!1,disabled:o,className:a="",children:i,...n})=>e.jsxs("button",{className:`
        inline-flex items-center justify-center font-medium rounded-md
        focus:outline-none focus:ring-2 focus:ring-offset-2
        transition-colors disabled:opacity-50 disabled:cursor-not-allowed
        ${c[t]}
        ${l[s]}
        ${a}
      `,disabled:o||r,...n,children:[r&&e.jsxs("svg",{className:"animate-spin -ml-1 mr-2 h-4 w-4",fill:"none",viewBox:"0 0 24 24","aria-hidden":"true",children:[e.jsx("circle",{className:"opacity-25",cx:"12",cy:"12",r:"10",stroke:"currentColor",strokeWidth:"4"}),e.jsx("path",{className:"opacity-75",fill:"currentColor",d:"M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"})]}),i]});export{d as B};
