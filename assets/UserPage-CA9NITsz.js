import{r as l,u as R,P as U,a as B,b as $,D as G,d as I,O,I as K,l as X,a0 as Y,a1 as Q,j as i,C as V}from"../index.js";import{C as Z}from"./ModelCard-VbN0lOo1.js";import{SupabaseService as _}from"./SupabaseService-BE7KA2gQ.js";import{B as D,M as S}from"./ModelGallery-BjGdRo96.js";import{D as ee}from"./dialog.esm-C7tcdkgY.js";import{B as k}from"./button.esm-iOg5UvVS.js";import"./utils-DRB1n_X_.js";import"./paginator.esm-C2mMQgrX.js";import"./dropdown.esm-CoEZyfAG.js";import"./index.esm-BHvanpNW.js";function x(e){"@babel/helpers - typeof";return x=typeof Symbol=="function"&&typeof Symbol.iterator=="symbol"?function(n){return typeof n}:function(n){return n&&typeof Symbol=="function"&&n.constructor===Symbol&&n!==Symbol.prototype?"symbol":typeof n},x(e)}function te(e,n){if(x(e)!="object"||!e)return e;var t=e[Symbol.toPrimitive];if(t!==void 0){var a=t.call(e,n);if(x(a)!="object")return a;throw new TypeError("@@toPrimitive must return a primitive value.")}return(n==="string"?String:Number)(e)}function ne(e){var n=te(e,"string");return x(n)=="symbol"?n:n+""}function re(e,n,t){return(n=ne(n))in e?Object.defineProperty(e,n,{value:t,enumerable:!0,configurable:!0,writable:!0}):e[n]=t,e}function C(){return C=Object.assign?Object.assign.bind():function(e){for(var n=1;n<arguments.length;n++){var t=arguments[n];for(var a in t)({}).hasOwnProperty.call(t,a)&&(e[a]=t[a])}return e},C.apply(null,arguments)}function ae(e){if(Array.isArray(e))return e}function ie(e,n){var t=e==null?null:typeof Symbol<"u"&&e[Symbol.iterator]||e["@@iterator"];if(t!=null){var a,r,o,d,c=[],s=!0,u=!1;try{if(o=(t=t.call(e)).next,n!==0)for(;!(s=(a=o.call(t)).done)&&(c.push(a.value),c.length!==n);s=!0);}catch(m){u=!0,r=m}finally{try{if(!s&&t.return!=null&&(d=t.return(),Object(d)!==d))return}finally{if(u)throw r}}return c}}function z(e,n){(n==null||n>e.length)&&(n=e.length);for(var t=0,a=Array(n);t<n;t++)a[t]=e[t];return a}function le(e,n){if(e){if(typeof e=="string")return z(e,n);var t={}.toString.call(e).slice(8,-1);return t==="Object"&&e.constructor&&(t=e.constructor.name),t==="Map"||t==="Set"?Array.from(e):t==="Arguments"||/^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(t)?z(e,n):void 0}}function oe(){throw new TypeError(`Invalid attempt to destructure non-iterable instance.
In order to be iterable, non-array objects must have a [Symbol.iterator]() method.`)}function N(e,n){return ae(e)||ie(e,n)||le(e,n)||oe()}var se={root:function(n){var t=n.props,a=n.state;return I("p-avatar p-component",{"p-avatar-image":O.isNotEmpty(t.image)&&!a.imageFailed,"p-avatar-circle":t.shape==="circle","p-avatar-lg":t.size==="large","p-avatar-xl":t.size==="xlarge","p-avatar-clickable":!!t.onClick})},label:"p-avatar-text",icon:"p-avatar-icon"},ce=`
@layer primereact {
    .p-avatar {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 2rem;
        height: 2rem;
        font-size: 1rem;
    }
    
    .p-avatar.p-avatar-image {
        background-color: transparent;
    }
    
    .p-avatar.p-avatar-circle {
        border-radius: 50%;
    }
    
    .p-avatar.p-avatar-circle img {
        border-radius: 50%;
    }
    
    .p-avatar .p-avatar-icon {
        font-size: 1rem;
    }
    
    .p-avatar img {
        width: 100%;
        height: 100%;
    }
    
    .p-avatar-clickable {
        cursor: pointer;
    }
}
`,P=B.extend({defaultProps:{__TYPE:"Avatar",className:null,icon:null,image:null,imageAlt:"avatar",imageFallback:"default",label:null,onImageError:null,shape:"square",size:"normal",style:null,template:null,children:void 0},css:{classes:se,styles:ce}});function A(e,n){var t=Object.keys(e);if(Object.getOwnPropertySymbols){var a=Object.getOwnPropertySymbols(e);n&&(a=a.filter(function(r){return Object.getOwnPropertyDescriptor(e,r).enumerable})),t.push.apply(t,a)}return t}function de(e){for(var n=1;n<arguments.length;n++){var t=arguments[n]!=null?arguments[n]:{};n%2?A(Object(t),!0).forEach(function(a){re(e,a,t[a])}):Object.getOwnPropertyDescriptors?Object.defineProperties(e,Object.getOwnPropertyDescriptors(t)):A(Object(t)).forEach(function(a){Object.defineProperty(e,a,Object.getOwnPropertyDescriptor(t,a))})}return e}var M=l.forwardRef(function(e,n){var t=R(),a=l.useContext(U),r=P.getProps(e,a),o=l.useRef(null),d=l.useState(!1),c=N(d,2),s=c[0],u=c[1],m=l.useState(!1),f=N(m,2),v=f[0],y=f[1],g=P.setMetaData({props:r,state:{imageFailed:s,nested:v}}),p=g.ptm,h=g.cx,E=g.isUnstyled;$(P.css.styles,E,{name:"avatar"});var F=function(){if(O.isNotEmpty(r.image)&&!s){var b=t({src:r.image,onError:L},p("image"));return l.createElement("img",C({alt:r.imageAlt},b))}else if(r.label){var J=t({className:h("label")},p("label"));return l.createElement("span",J,r.label)}else if(r.icon){var q=t({className:h("icon")},p("icon"));return K.getJSXIcon(r.icon,de({},q),{props:r})}return null},L=function(b){r.imageFallback==="default"?r.onImageError||(u(!0),b.target.src=null):b.target.src=r.imageFallback,r.onImageError&&r.onImageError(b)};l.useEffect(function(){var j=G.isAttributeEquals(o.current.parentElement,"data-pc-name","avatargroup");y(j)},[]),l.useImperativeHandle(n,function(){return{props:r,getElement:function(){return o.current}}});var H=t({ref:o,style:r.style,className:I(r.className,h("root",{imageFailed:s}))},P.getOtherProps(r),p("root")),W=r.template?O.getJSXElement(r.template,r):F();return l.createElement("div",H,W,r.children)});M.displayName="Avatar";var ue={root:function(n){var t=n.props,a=n.horizontal,r=n.vertical;return I("p-divider p-component p-divider-".concat(t.layout," p-divider-").concat(t.type),{"p-divider-left":a&&(!t.align||t.align==="left"),"p-divider-right":a&&t.align==="right","p-divider-center":a&&t.align==="center"||r&&(!t.align||t.align==="center"),"p-divider-top":r&&t.align==="top","p-divider-bottom":r&&t.align==="bottom"},t.className)},content:"p-divider-content"},pe=`
@layer primereact {
    .p-divider-horizontal {
        display: flex;
        width: 100%;
        position: relative;
        align-items: center;
    }
    
    .p-divider-horizontal:before {
        position: absolute;
        display: block;
        top: 50%;
        left: 0;
        width: 100%;
        content: "";
    }
    
    .p-divider-horizontal.p-divider-left {
        justify-content: flex-start;
    }
    
    .p-divider-horizontal.p-divider-right {
        justify-content: flex-end;
    }
    
    .p-divider-horizontal.p-divider-center {
        justify-content: center;
    }
    
    .p-divider-content {
        z-index: 1;
    }
    
    .p-divider-vertical {
        min-height: 100%;
        margin: 0 1rem;
        display: flex;
        position: relative;
        justify-content: center;
    }
    
    .p-divider-vertical:before {
        position: absolute;
        display: block;
        top: 0;
        left: 50%;
        height: 100%;
        content: "";
    }
    
    .p-divider-vertical.p-divider-top {
        align-items: flex-start;
    }
    
    .p-divider-vertical.p-divider-center {
        align-items: center;
    }
    
    .p-divider-vertical.p-divider-bottom {
        align-items: flex-end;
    }
    
    .p-divider-solid.p-divider-horizontal:before {
        border-top-style: solid;
    }
    
    .p-divider-solid.p-divider-vertical:before {
        border-left-style: solid;
    }
    
    .p-divider-dashed.p-divider-horizontal:before {
        border-top-style: dashed;
    }
    
    .p-divider-dashed.p-divider-vertical:before {
        border-left-style: dashed;
    }
    
    .p-divider-dotted.p-divider-horizontal:before {
        border-top-style: dotted;
    }
    
    .p-divider-dotted.p-divider-horizontal:before {
        border-left-style: dotted;
    }
}
`,me={root:function(n){var t=n.props;return{justifyContent:t.layout==="horizontal"?t.align==="center"||t.align===null?"center":t.align==="left"?"flex-start":t.align==="right"?"flex-end":null:null,alignItems:t.layout==="vertical"?t.align==="center"||t.align===null?"center":t.align==="top"?"flex-start":t.align==="bottom"?"flex-end":null:null}}},w=B.extend({defaultProps:{__TYPE:"Divider",align:null,layout:"horizontal",type:"solid",style:null,className:null,children:void 0},css:{classes:ue,styles:pe,inlineStyles:me}}),T=l.forwardRef(function(e,n){var t=R(),a=l.useContext(U),r=w.getProps(e,a),o=w.setMetaData({props:r}),d=o.ptm,c=o.cx,s=o.sx,u=o.isUnstyled;$(w.css.styles,u,{name:"divider"});var m=l.useRef(null),f=r.layout==="horizontal",v=r.layout==="vertical";l.useImperativeHandle(n,function(){return{props:r,getElement:function(){return m.current}}});var y=t({ref:m,style:s("root"),className:c("root",{horizontal:f,vertical:v}),"aria-orientation":r.layout,role:"separator"},w.getOtherProps(r),d("root")),g=t({className:c("content")},d("content"));return l.createElement("div",y,l.createElement("div",g,r.children))});T.displayName="Divider";function we(){const[e,n]=l.useState(null),[t,a]=l.useState(!0),[r,o]=l.useState(!1),[d,c]=l.useState(!1),s=X(),u=Y(),f=Q().pathname.split("/").filter(Boolean),v=f[f.length-1];l.useEffect(()=>{(async()=>{if(a(!0),!s.user){n(null),o(!1),a(!1);return}const E=await _.fetchUserStats(s.user.id);n(E),o(!0),a(!1)})()},[]);function y(){return e?.username?v===e.username?i.jsx(S,{filter:{author:e.username}}):v==="liked"?i.jsx(S,{filter:{likedByUsername:e.username}}):v==="commented"?i.jsx(S,{filter:{commentedByUsername:e.username}}):i.jsx(S,{filter:{author:e.username}}):null}function g(){(async()=>(await _.deleteUser(s.user?.id),await s.logout(),c(!1),u("/")))()}function p(){c(!1)}return i.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:16},children:[i.jsx("div",{style:{display:"flex",flexDirection:"row",justifyContent:"center",gap:24},children:i.jsx(Z,{style:{minWidth:300,maxWidth:400},children:t?i.jsx(V,{text:"Loading user stats"}):e?i.jsxs("div",{style:{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:8},children:[i.jsx(M,{image:e.avatar_url,shape:"circle",size:"xlarge"}),i.jsx("h2",{style:{margin:0},children:e.username}),i.jsx("div",{children:i.jsxs("a",{href:`https://github.com/${e.username}`,className:"p-button p-button-text",target:"_blank",rel:"noopener noreferrer",children:[i.jsx("i",{className:"pi pi-github",style:{marginRight:4}}),"github.com/",e.username]})}),i.jsxs("div",{children:["Joined: ",e.created_at]}),i.jsxs("div",{children:["Last sign in: ",e.last_sign_in_at]}),i.jsx(T,{}),i.jsxs("div",{style:{display:"flex",flexDirection:"row",justifyContent:"center",gap:12,width:"100%",flexWrap:"wrap"},children:[i.jsxs("a",{href:"#/user/"+e.username,className:"p-button p-button-outlined",style:{display:"inline-flex",alignItems:"center",gap:6},children:["Models",i.jsx(D,{value:e.models_count,style:{background:"#333"}})]}),i.jsxs("a",{href:"#/user/"+e.username+"/liked",className:"p-button p-button-outlined",style:{display:"inline-flex",alignItems:"center",gap:6},children:["Likes",i.jsx(D,{value:e.likes_count,style:{background:"#333"}})]}),i.jsxs("a",{href:"#/user/"+e.username+"/commented",className:"p-button p-button-outlined",style:{display:"inline-flex",alignItems:"center",gap:6},children:["Comments",i.jsx(D,{value:e.comments_count,style:{background:"#333"}})]})]})]}):i.jsx("div",{children:"Could not load user profile."})})}),y(),i.jsx(ee,{header:"Confirm Account Deletion",visible:d,onHide:p,modal:!0,closable:!1,style:{minWidth:300,maxWidth:600},footer:i.jsxs("div",{style:{display:"flex",justifyContent:"flex-end",gap:8},children:[i.jsx(k,{label:"Cancel",icon:"pi pi-times",severity:"info",outlined:!0,onClick:p}),i.jsx(k,{label:"Delete",icon:"pi pi-trash",severity:"danger",outlined:!0,onClick:g})]}),children:i.jsx("div",{style:{padding:8},children:i.jsx("p",{children:"Are you sure you want to delete your account and all data associated with it (likes, comments, models)? This action cannot be undone."})})})]})}export{we as default};
