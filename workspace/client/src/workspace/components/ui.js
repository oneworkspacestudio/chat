import React from 'react';
export const Page=({children})=>React.createElement('section',{className:'workspace-connection'},children);
export const Card=({children})=>React.createElement(React.Fragment,null,children);
export const Heading=({level=1,children})=>React.createElement('h'+level,null,children);
export const Text=({children})=>React.createElement('p',null,children);
export const Image=({src,alt})=>React.createElement('img',{src,alt});
export const Button=({children,onClick})=>React.createElement('button',{type:'button',onClick},children);
export const Link=({href,children})=>React.createElement('a',{href},children);
