import{r as l,u as C,P as F,C as T,a as R,d as S,O,x as D,j as r,q as L}from"../index.js";import{SupabaseService as U}from"./SupabaseService-BE7KA2gQ.js";import{a as G}from"./ModelCard-Drve7K6_.js";import{P as H}from"./paginator.esm-BxKkpYPe.js";function y(e){"@babel/helpers - typeof";return y=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(t){return typeof t}:function(t){return t&&typeof Symbol=="function"&&t.constructor===Symbol&&t!==Symbol.prototype?"symbol":typeof t},y(e)}function $(e,t){if(y(e)!="object"||!e)return e;var n=e[Symbol.toPrimitive];if(n!==void 0){var s=n.call(e,t);if(y(s)!="object")return s;throw new TypeError("@@toPrimitive must return a primitive value.")}return(t==="string"?String:Number)(e)}function K(e){var t=$(e,"string");return y(t)=="symbol"?t:t+""}function B(e,t,n){return(t=K(t))in e?Object.defineProperty(e,t,{value:n,enumerable:!0,configurable:!0,writable:!0}):e[t]=n,e}var q={root:function(t){var n=t.props;return S("p-badge p-component",B({"p-badge-no-gutter":O.isNotEmpty(n.value)&&String(n.value).length===1,"p-badge-dot":O.isEmpty(n.value),"p-badge-lg":n.size==="large","p-badge-xl":n.size==="xlarge"},"p-badge-".concat(n.severity),n.severity!==null))}},z=`
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
`,b=T.extend({defaultProps:{__TYPE:"Badge",__parentMetadata:null,value:null,severity:null,size:null,style:null,className:null,children:void 0},css:{classes:q,styles:z}});function w(e,t){var n=Object.keys(e);if(Object.getOwnPropertySymbols){var s=Object.getOwnPropertySymbols(e);t&&(s=s.filter(function(o){return Object.getOwnPropertyDescriptor(e,o).enumerable})),n.push.apply(n,s)}return n}function I(e){for(var t=1;t<arguments.length;t++){var n=arguments[t]!=null?arguments[t]:{};t%2?w(Object(n),!0).forEach(function(s){B(e,s,n[s])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(n)):w(Object(n)).forEach(function(s){Object.defineProperty(e,s,Object.getOwnPropertyDescriptor(n,s))})}return e}var E=l.memo(l.forwardRef(function(e,t){var n=C(),s=l.useContext(F),o=b.getProps(e,s),p=b.setMetaData(I({props:o},o.__parentMetadata)),h=p.ptm,f=p.cx,v=p.isUnstyled;R(b.css.styles,v,{name:"badge"});var m=l.useRef(null);l.useImperativeHandle(t,function(){return{props:o,getElement:function(){return m.current}}});var x=n({ref:m,style:o.style,className:S(o.className,f("root"))},b.getOtherProps(o),h("root"));return l.createElement("span",x,o.value)}));E.displayName="Badge";function V({filter:e,style:t,pageSize:n=20,pagination:s=!0}){const{tag:o}=D();o&&(e={...e,tag:o});const[p,h]=l.useState([]),[f,v]=l.useState(0),[m,x]=l.useState(0),[P,M]=l.useState(!0),[j,_]=l.useState([]);l.useEffect(()=>{async function a(){const{models:i,total:u}=await U.fetchModels(e,m,n);h(i),v(u);const g={};i.forEach(c=>{(c.tags||[]).forEach(d=>{g[d]=(g[d]||0)+1})});const k=Object.entries(g).map(([c,d])=>({key:c,tag:c,count:d})).sort((c,d)=>d.count-c.count||c.tag.localeCompare(d.tag));_(k),M(!1)}a()},[m,n,e]);function N(a){if(!a)return r.jsx(r.Fragment,{});const i=g=>r.jsx("span",{style:{color:"var(--theme-color)"},children:g}),u=[r.jsx(r.Fragment,{children:"Models"})];return a.tag&&u.push(r.jsxs(r.Fragment,{children:[" tagged with ",i(a.tag)]})),a.author&&u.push(r.jsxs(r.Fragment,{children:[" authored by ",i(a.author)]})),a.likedByUsername&&u.push(r.jsxs(r.Fragment,{children:[" liked by ",i(a.likedByUsername)]})),a.commentedByUsername&&u.push(r.jsxs(r.Fragment,{children:[" commented by ",i(a.commentedByUsername)]})),a.searchTerm&&u.push(r.jsxs(r.Fragment,{children:[" containing ",i(a.searchTerm)]})),r.jsx("h1",{style:{flex:0,marginLeft:"auto",marginRight:"auto",marginBottom:0},children:u})}return r.jsxs("div",{style:{...t,display:"flex",flexDirection:"column",gap:16,width:"100%"},children:[N(e),P?r.jsx(L,{text:"Loading models"}):r.jsxs(r.Fragment,{children:[r.jsxs("div",{className:"model-gallery",children:[p.map(a=>r.jsx(G,{model:a},a.id)),p.length===0&&r.jsx("div",{style:{gridColumn:"1 / -1"},children:"No models found."})]}),s&&f>n&&r.jsx(H,{first:m,rows:n,totalRecords:f,onPageChange:a=>x(a.first),template:"PrevPageLink PageLinks NextPageLink",rowsPerPageOptions:[],style:{flex:0,marginLeft:"auto",marginRight:"auto"}}),j&&j.length>0&&r.jsx("div",{style:{display:"flex",flexWrap:"wrap",gap:8},children:j.map(({tag:a,count:i})=>r.jsxs("a",{href:`/#/tag/${a}`,className:"p-button p-button-outlined",children:["#",a,r.jsx(E,{value:i,style:{background:"#333"}},a)]},a))})]})]})}const Q=Object.freeze(Object.defineProperty({__proto__:null,default:V},Symbol.toStringTag,{value:"Module"}));export{E as B,V as M,Q as a};
