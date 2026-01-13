import{r as o,u as v,P,a as O,b as j,d,O as u}from"../index.js";function s(t){"@babel/helpers - typeof";return s=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(e){return typeof e}:function(e){return e&&typeof Symbol=="function"&&e.constructor===Symbol&&e!==Symbol.prototype?"symbol":typeof e},s(t)}function h(t,e){if(s(t)!="object"||!t)return t;var r=t[Symbol.toPrimitive];if(r!==void 0){var n=r.call(t,e);if(s(n)!="object")return n;throw new TypeError("@@toPrimitive must return a primitive value.")}return(e==="string"?String:Number)(t)}function w(t){var e=h(t,"string");return s(e)=="symbol"?e:e+""}function m(t,e,r){return(e=w(e))in t?Object.defineProperty(t,e,{value:r,enumerable:!0,configurable:!0,writable:!0}):t[e]=r,t}var x={root:function(e){var r=e.props;return d("p-badge p-component",m({"p-badge-no-gutter":u.isNotEmpty(r.value)&&String(r.value).length===1,"p-badge-dot":u.isEmpty(r.value),"p-badge-lg":r.size==="large","p-badge-xl":r.size==="xlarge"},"p-badge-".concat(r.severity),r.severity!==null))}},S=`
@layer primereact {
    .p-badge {
        display: inline-block;
        border-radius: 10px;
        text-align: center;
        padding: 0 .5rem;
    }
    
    .p-overlay-badge {
        position: relative;
    }
    
    .p-overlay-badge .p-badge {
        position: absolute;
        top: 0;
        right: 0;
        transform: translate(50%,-50%);
        transform-origin: 100% 0;
        margin: 0;
    }
    
    .p-badge-dot {
        width: .5rem;
        min-width: .5rem;
        height: .5rem;
        border-radius: 50%;
        padding: 0;
    }
    
    .p-badge-no-gutter {
        padding: 0;
        border-radius: 50%;
    }
}
`,i=O.extend({defaultProps:{__TYPE:"Badge",__parentMetadata:null,value:null,severity:null,size:null,style:null,className:null,children:void 0},css:{classes:x,styles:S}});function c(t,e){var r=Object.keys(t);if(Object.getOwnPropertySymbols){var n=Object.getOwnPropertySymbols(t);e&&(n=n.filter(function(a){return Object.getOwnPropertyDescriptor(t,a).enumerable})),r.push.apply(r,n)}return r}function E(t){for(var e=1;e<arguments.length;e++){var r=arguments[e]!=null?arguments[e]:{};e%2?c(Object(r),!0).forEach(function(n){m(t,n,r[n])}):Object.getOwnPropertyDescriptors?Object.defineProperties(t,Object.getOwnPropertyDescriptors(r)):c(Object(r)).forEach(function(n){Object.defineProperty(t,n,Object.getOwnPropertyDescriptor(r,n))})}return t}var _=o.memo(o.forwardRef(function(t,e){var r=v(),n=o.useContext(P),a=i.getProps(t,n),l=i.setMetaData(E({props:a},a.__parentMetadata)),b=l.ptm,g=l.cx,y=l.isUnstyled;j(i.css.styles,y,{name:"badge"});var p=o.useRef(null);o.useImperativeHandle(e,function(){return{props:a,getElement:function(){return p.current}}});var f=r({ref:p,style:a.style,className:d(a.className,g("root"))},i.getOtherProps(a),b("root"));return o.createElement("span",f,a.value)}));_.displayName="Badge";export{_ as B};
