"use strict";
{
  const LAST_ATTR_NAME = /\s+([\w-]+)\s*=\s*"?\s*$/;
  const NEW_TAG = /<[\w\-]+/;
  const parser = new DOMParser;

  Object.assign(self,{R,render,fc});

  function R(parts, ...vals) {
    parts = Array.from(parts);
    const handlers = {};
    vals = vals.map( v => {
      if ( Array.isArray(v) && v.every(item => !!item.handlers && !!item.str) ) {
        return join(v) || '';
      } else if ( typeof v == "object" && !!v && !(v.str && v.handlers) ) {
        throw { error: `Object properties not allowed`, value: v };
      } else return (v == null || v == undefined) ? '' : v;
    });
    let str = '';
    let newHid = false;
    let hidSaved = false;
    let hid;
    while(parts.length > 1) {
      let part = parts.shift();
      newHid = part.match(NEW_TAG);
      if ( newHid ) {
        hid = 'hid_' + Math.random();
        hidSaved = false;
      }
      let attrNameMatches = part.match(LAST_ATTR_NAME);
      let val = vals.shift();
      if ( typeof val == "function" ) {
        let attrName;
        if ( attrNameMatches && attrNameMatches.length > 1) {
          attrName = attrNameMatches[1].replace(/^on/,'').toLowerCase();
        }
        const newPart = part.replace(attrNameMatches[0], '');
        if ( attrName ) {
          str += newPart;
        } else {
          str += part;
        }
        if ( !hidSaved ) {
          handlers[hid] = [];
          hidSaved = true;
          str += ` data-hid="${hid}"`;
        }
        handlers[hid].push({
          eventName: attrName, handler: val
        })
      } else if ( !! val && val.handlers && val.str ) {
        Object.assign(handlers,val.handlers);
        str += part;
        val = val.str;
        if ( attrNameMatches ) {
          val = `"${val}"`;
        }
        str += val;
      } else {
        str += part;
        if ( attrNameMatches ) {
          val = `"${safe(val)}"`;
        } else {
          val = safe(val);
        }
        str += val;
      }
    }
    str += parts.shift();
    return {str,handlers};
  }

  function render(r, root, {replace:replace = false} = {}) {
    if (Array.isArray(r) && r.every(val => !!val.str && !!val.handlers)) {
      r = join(r);
    }
    let {str,handlers} = r;
    if ( replace ) {
      root.parentElement.replaceChild(fc(str),root);
    } else {
      root.innerHTML = '';
      root.insertAdjacentHTML('afterBegin', str);
    }
    Object.keys(handlers).forEach( hid => {
      const node = document.querySelector(`[data-hid="${hid}"]`);
      const node_handlers = handlers[hid];
      if ( !! node && !! node_handlers ) {
        node_handlers.forEach(({eventName,handler}) => {
          node.addEventListener(eventName,handler);
        });
      } else {
        throw {error: `Node or handlers could not be found for ${hid}`, hid};
      }
    });
  }
  
  function join(rs) {
    const H = {};
    const str = rs.map(({str,handlers}) => (Object.assign(H,handlers),str)).join('\n');
    if ( !! str ) {
      return {str,handlers:H};
    }
  }
  
  function safe(v) {
    return (v+'').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/&/g,'&amp;').replace(/"/g,'&#34;').replace(/'/g,'&#39;');
  }

  function fc(t, frag = false) {
    const fragment = parser.parseFromString(`<template>${t}</template>`,"text/html").head.firstElementChild.content;
    if ( frag ) {
      return fragment;
    }
    return fragment.firstElementChild;
  }
}
