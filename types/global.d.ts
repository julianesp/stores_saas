// Declaraciones para permitir importaciones de CSS/SCSS en TypeScript
// Evita advertencias como "Cannot find module './globals.css' or its corresponding type declarations." 

declare module '*.css';
declare module '*.scss';
declare module '*.sass';

declare module '*.module.css';
declare module '*.module.scss';
declare module '*.module.sass';
