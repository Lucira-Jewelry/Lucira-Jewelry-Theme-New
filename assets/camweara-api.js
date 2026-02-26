
var camweara_key = "",
  skus_non_tryon = [],
  mainsku,
  pageData,
  skudata,
  BuyNowEnable = true,
  productIdShopify,
  shopifySearch,
  recommendedSkus = "",
  prodRecommendation,
  productCategory,
  bynowCallback,
  calledloadtryonfun = 0,
  loadfirstTimeOnly,
  pageHasBeenLoaded,
  checkCloseTryonPopUp,
  camwearaRegionID = 0,
  cacheNum,               //to clear cdn cache using temporary characters
  carat = "",                  
  dshape;                 //diamond shape

  var camwearaBucketArray = ['https://camweara-customers.s3.ap-south-1.amazonaws.com', 'https://storage1.camweara.com',
    'https://virginia-bucket-camweara.s3.amazonaws.com', 
    ]

if (!document.querySelector("#fontawesomelinkTag")) {
  const fontAwesomeLink = document.createElement("link");
  fontAwesomeLink.rel = "stylesheet";
  fontAwesomeLink.id = "fontawesomelinkTag";
  fontAwesomeLink.href =
    "https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css";
  document.head.appendChild(fontAwesomeLink);
}

function onTryonClick(psku, companyname, frameWidthInMM) {
  if (!psku) psku = mainsku;
  psku = psku.includes("--MB") ? psku.replace("--MB", "") : psku;
  // psku = psku.replaceAll(",", "");
  psku = encodeURIComponent(psku);
  
  if (!camweara_key) camweara_key = companyname;

  let urlNew =
    "https://cdn.camweara.com/camweara_virtual_tryon/?skus=";

  if (typeof productCategory === "undefined") productCategory = "jewelry_skus";

  if (productCategory.includes("electronics")){
    urlNew = "https://cdn.camweara.com/camweara_electronics?skus=";
  }
  else if(productCategory.includes("clothes_skus")){
    urlNew = "https://cdn.camweara.com/clothing_virtual_tryon?skus=";
  }
  else if(productCategory.includes("diamond")){
    urlNew = "https://cdn.camweara.com/camweara_diamond?";
  }
  else if(productCategory.includes("clothes2d_skus")){
    urlNew = "https://cdn.camweara.com/clothes_genai_tryon/?skus=";
  }

  if (typeof BuyNowEnable == "undefined" || BuyNowEnable == "true") {
    urlNew = recommendedSkus
      ? urlNew +
        psku +
        "," +
        recommendedSkus.replace(psku + ",", "") +
        "&company_name=" +
        camweara_key +
        ""
      : urlNew + psku + "&company_name=" + camweara_key + "";
  } else {
    urlNew = recommendedSkus
      ? urlNew +
        psku +
        "," +
        recommendedSkus.replace(psku + ",", "") +
        "&company_name=" +
        camweara_key +
        "&buynow=0"
      : urlNew + psku + "&company_name=" + camweara_key + "&buynow=0";
  }

  if (prodRecommendation) {
    urlNew = urlNew + "&product_recommendation=" + prodRecommendation;
  }

  if(frameWidthInMM != null){
      urlNew = urlNew + "&frame_width=" + frameWidthInMM;
  }

  if(cacheNum != null){
      urlNew = urlNew + "&temp=" + cacheNum;
  }

  if(carat.length > 0){
      urlNew = urlNew + "&carat=" + carat+"&dshape="+dshape;
  }

  let iframe = document.getElementById("iFrameID");
  iframe.setAttribute("src", urlNew);
  iframe.style.display = "block";
}

function addTryOnEventListener() {
     window.addEventListener('message', tryonEventHandler);
}

// Function to handle the event
function tryonEventHandler(event) {
  if (~event.origin.indexOf("https://cdn.camweara.com") && !event.data.includes("UserID")) {
   //  console.log("message: " + event.data);
    if (event.data == "closeIframe") {
          let iframe = document.getElementById("iFrameID");
          iframe.setAttribute("src", "");
          iframe.style.display = "none";
    } else if (typeof event.data == "string" && event.data.includes("buynow")) {
          let iframe = document.getElementById("iFrameID");
          if (checkCloseTryonPopUp === "true") {
            iframe.setAttribute("src", "");
            iframe.style.display = "none";
          }
          let skuBuynow = event.data.substring(7, event.data.length);
          console.log("buynow Sku: ", skuBuynow);
          if (bynowCallback) {
            let eachsku = skuBuynow;
            //parent.bynowCallback(sku);
            window[bynowCallback](eachsku);
          } else if (typeof productIdShopify !== "undefined") {
            window.open(
              `https://${camweara_key}.myshopify.com/cart/add?id=${productIdShopify}`,
              `${checkCloseTryonPopUp === "true" ? "_self" : "_blank"}`
            );
          } else if (shopifySearch) {
            window.open(
              `https://${camweara_key}.myshopify.com/search?type=product&q=variants.sku:${skuBuynow}`,
              `${checkCloseTryonPopUp === "true" ? "_self" : "_blank"}`
            );
          }
    } else if (event.data == "requestParentUrl") {
          //for share button click on try on
          event.source.postMessage(
            {
              type: "requestParentUrl",
              url: window.location.href,
            },
            event.origin
          );
          return;
    }

    if (checkCloseTryonPopUp === "true") {
       removeTryOnIframe();
    }
    addTryOnIframe();
  }
}

function addScript(src, id, callbackfun) {
  let s = document.createElement("script");
  s.setAttribute("src", src);
  s.id = id;
  s.onload = callbackfun;
  document.body.appendChild(s);
}

window.getSkusListWithTryOn = (req) => {
  const { companyName } = req || {};
  let { category } = req || {};
  let { regionId } = req || {};

  if (typeof category === 'undefined') category = 'jewelry_skus';
  if (typeof regionId === 'undefined') regionId = '0';

  return new Promise((resolve, reject) => {
    try {
      if (!companyName) {
        throw new Error("companyName is required");
      }

      let tryonJsonUrl = camwearaBucketArray[regionId] + `/${companyName}/${companyName}_tryonbutton.json`;

      fetch(tryonJsonUrl)
        .then((res) => {
          if (!res.ok) {
            throw new Error(`HTTP error: ${res.status}`);
          } else {
            return res.json();
          }
        })
        .then((data) => {
          resolve(data[category]);
        })
        .catch((error) => {
          reject(error);
        });
    } catch (error) {
      reject(error);
    }
  });
};

async function nonTryOnProductsReportskus() {
  const buckName =
    "$6c7%a2#m.5#w0$e6*a6%r67@a56&-76^c65$u66%<s86%t%9*o6%$m9$e6!?r45:s09{$";
  const buckReg = "&8^a,&5p.%&-*!^s=7@o^54u*&5t+*6h*&5-^&%j*_&j";
  const IdtyPlId =
    "&^a%$?/p%$%>,-^&%^&s&^o$$%#u(*t&^$h^&%$-^&$j&^$j^&$#@#!~:~!0@^$4^&%^#3%$^%#5#@4!@$b,.?3:'c?>-<>b?>0_=c+=9?'-<>;4&^%2#@$0|}3{:->?<b>?0:5%$c<>$%-^&b*$#f&%3<>@$5@$%c*&^%$a^$#1&*^%$6&%@!7*&^$8&%#3&%#@c(&&%";
  if (camweara_key) {
    AWS.config.update({
      region: buckReg.replace(/[^A-Za-z\-]/g, "").replace("jj", "1"),
      credentials: new AWS.CognitoIdentityCredentials({
        IdtyPlId: IdtyPlId.replace(/[^A-Za-z0-9\-]/g, "").replace(
          "jj",
          "1:"
        ),
      }),
    });

    const s3 = new AWS.S3({
      apiVersion: "2006-03-01",
      params: { Bucket: buckName.replace(/[^A-Za-z\-]/g, "") },
    });
    AWS.config.update({ correctClockSkew: true });
    let file = { sku: skus_non_tryon };
    let jsonData = new Blob(
      [JSON.stringify(file, null, "\t").replace(/\\/g, "")],
      { type: "application/json" }
    );

    let nonTryOnJsonURL = camwearaBucketArray[camwearaRegionID] + `/${camweara_key}/${camweara_key}_non_tryon.json?${Math.random()}`;

    try {
      let res = await fetch(nonTryOnJsonURL);
      if (res.status !== 200) {
        throw res.status;
      } else {
        let data = await res.json();
        let oldskus = data.sku;
        skus_non_tryon = Array.from(new Set([...oldskus, ...skus_non_tryon]));
        if (skus_non_tryon.length > 0) {
          let file = { sku: skus_non_tryon };
          let jsonData = new Blob(
            [JSON.stringify(file, null, "\t").replace(/\\/g, "")],
            { type: "application/json" }
          );
          s3.upload(
            {
              Key: camweara_key + "/" + camweara_key + "_non_tryon.json",
              Body: jsonData,
              ACL: "public-read",
            },
            function (err) {
              if (err) {
                throw err;
              }
            }
          );
        } else {
          s3.upload(
            {
              Key: camweara_key + "/" + camweara_key + "_non_tryon.json",
              Body: jsonData,
              ACL: "public-read",
            },
            function (err) {
              if (err) {
                throw err;
              }
            }
          );
        }
      }
    } catch (error) {
      if (error === 403) {
        s3.upload(
          {
            Key: camweara_key + "/" + camweara_key + "_non_tryon.json",
            Body: jsonData,
            ACL: "public-read",
          },
          function (err) {
            if (err) {
              throw err;
            }
          }
        );
      } else {
        console.log("file not found");
      }
    }
  }
}

async function loadTryOnButton(data) {
   
  var page = data?.page,
    psku = data?.psku && data.psku?.main ? data.psku.main : data?.psku,
    nonTryOnProductsReport = data?.nonTryOnProductsReport || false,
    company = data?.company,
    appendButton = data?.appendButton ? data.appendButton : "default",
    prependButton = data?.prependButton ? data.prependButton : "default",
    MBappendButton = data?.MBappendButton ? data.MBappendButton : null,
    MBprependButton = data?.MBprependButton ? data.MBprependButton : null,
    styles = data?.styles,
    tryonButtonData = data?.tryonButtonData || null,
    MBtryonButtonData = data?.MBtryonButtonData || null,
    Error = !page
      ? "page"
      : !psku
      ? "psku"
      : !company
      ? "company"
      : !appendButton && !prependButton
      ? "appendButton or prependButton"
      : null;
  prodRecommendation = data?.prodRecommendation
    ? data?.prodRecommendation
    : false;
  recommendedSkus = data?.psku ? data.psku.recommendedSkus : null;
  BuyNowEnable = data?.buynow ? data.buynow.enable : null;
  productIdShopify = data?.buynow ? data.buynow.productIdShopify : null;
  shopifySearch = data.buynow ? data.buynow.searchProduct : null;
  bynowCallback = data?.buynowCallback;
  productCategory = data?.productCategory ? data.productCategory : '';
  checkCloseTryonPopUp =
    BuyNowEnable && data.buynow.closeTryOnPopup
      ? data.buynow.closeTryOnPopup
      : "true";
   camwearaRegionID = data?.regionId? data?.regionId: 0;        //to load json using mumbai, cdn and virginia buckets
   let frameWidth = data?.frameWidth ? data.frameWidth : null;
   cacheNum = data?.cacheNum ? data.cacheNum : null;
   carat = data?.carat ? data.carat : '';
   dshape = data?.dshape ? data.dshape : null;

  if(
    recommendedSkus &&
    (recommendedSkus.includes("[") ||
      recommendedSkus.includes("]") ||
      Array.isArray(recommendedSkus))
  ){
    recommendedSkus = recommendedSkus.toString().replace(/^[\[]|[\]]$/g, "");
    //trimming string if its very long
    recommendedSkus = trimString(recommendedSkus);
  }

  if (Error) {
    return console.error(
      Error +
        " is missing in loadTryOnButton function ,more info: see documentation at https://camweara.com/integrations/camweara_api.html"
    );
  }
  // if (nonTryOnProductsReport == "true" && page.toLowerCase() == "product") {
  //   //call addscript if the param nonTryOnProductsReport is true
  //   var checkscript = document.getElementById("S3Script");
  //   if (!checkscript) {
  //     let Allskus = JSON.parse(localStorage.getItem("tryonSkusData"));
  //     if (Allskus && !Allskus.sku.includes(psku)) {
  //       /*addScript(
  //         `https://camweara.com/integrations/aws-sdk-2.1.24.min.js`,
  //         "S3Script",
  //         nonTryOnProductsReportskus
  //       );*/
  //     }
  //   }
  // }
  pageData = page.toLowerCase();
  Addstyles(styles);
  if (company) camweara_key = company;
  mainsku = psku;
  psku = psku?.id ? psku.id : mainsku;
  
  if (!document.querySelector("#iFrameID")) {
    // iframeID Not Existing.
      addTryOnIframe();
      addAnalyticsSnippets(); 
      addTryOnEventListener();
  }

  // let non_tryon_file_url = `${tryon_url}${camweara_key}_non_tryon.json?${today}${Math.random()}`;
  if (psku.length < 1) {
    console.log("sku is blank");
    return;
  }
  if (!loadfirstTimeOnly) {
    pageHasBeenLoaded = sessionStorage.getItem("pageHasBeenLoaded");
    if (pageHasBeenLoaded) {
      loadfirstTimeOnly = "";
    }
  }
  let tryonSkusJson = "";
  if (!localStorage.getItem("tryonSkusData") || !loadfirstTimeOnly) {
    loadfirstTimeOnly = "loaded";
    sessionStorage.setItem("pageHasBeenLoaded", "true");
    let today = new Date();
    let dd = String(today.getDate()).padStart(2, "0");
    let mm = String(today.getMonth() + 1).padStart(2, "0"); //January is 0!
    let yyyy = today.getFullYear();
    today = dd + mm + yyyy;

    let tryonJsonUrl = camwearaBucketArray[camwearaRegionID] + `/${camweara_key}/`;

    let tryon_file_url = `${tryonJsonUrl}${
      camweara_key || company
    }_tryonbutton.json?${today}${Math.random()}`;
    let response = await fetch(tryon_file_url);
    if (response) {
      tryonSkusJson = await response.json();
      localStorage.setItem("tryonSkusData", JSON.stringify(tryonSkusJson));
    }
  } else {
    tryonSkusJson = JSON.parse(localStorage.getItem("tryonSkusData"));
  }

  if (tryonSkusJson) {
    RenderButton(
      page.toLowerCase(),
      tryonSkusJson,
      window.innerWidth >= 650 ? "desktop" : "mobile",
      appendButton,
      prependButton,
      MBprependButton,
      MBappendButton,
      company,
      psku,
      page,
      tryonButtonData,
      nonTryOnProductsReport,
      skus_non_tryon,
      MBtryonButtonData,
      styles,
      frameWidth
    );
  }
}

function RenderButton(
  page,
  tryonSkusJson,
  renderType,
  appendButton,
  prependButton,
  MBprependButton,
  MBappendButton,
  company,
  psku,
  page,
  tryonButtonData,
  nonTryOnProductsReport,
  skus_non_tryon,
  MBtryonButtonData,
  styles,
  frameWidth
) {
  if (tryonSkusJson && renderType) {
    if (page === "product") {
      console.log("tryon sku ", psku);
    }
    Addstyles(styles);
    
    let skuPosInJson = checkSkuLocation(tryonSkusJson, psku);
    
    if (productCategory == '' || typeof productCategory === "undefined") productCategory = skuPosInJson[0];

    if (skuPosInJson.length > 0 || carat.length > 0){
      let buttonID,
        buttonClassName,
        buttonIcon,
        buttonText,
        appendButtonSelector,
        prependButtonSelector;

        //if it is not passed in the API

      if (renderType === "mobile") {
        buttonID =
          page == "listing"
            ? `MB--${psku.replace(/[^A-Za-z0-9]/g, "")}--MB`
            : "MB_tryonButton";

        buttonClassName = "MB_tryonButton";

        buttonIcon = MBtryonButtonData
          ? MBtryonButtonData.faIcon
          : tryonButtonData && tryonButtonData.faIcon;
        buttonText = MBtryonButtonData
          ? MBtryonButtonData.text
          : tryonButtonData && tryonButtonData.text;

        appendButtonSelector = MBappendButton
          ? MBappendButton.id
            ? "#" + MBappendButton.id
            : MBappendButton.class
            ? "." + MBappendButton.class.replace(/\s/g, ".")
            : appendButton == "default" && prependButton == "default"
            ? 'form[action="/cart/add"]'
            : null
          : !MBprependButton ? appendButton.id
          ? "#" + appendButton.id
          : appendButton.class
          ? "." + appendButton.class.replace(/\s/g, ".")
          : appendButton == "default" && prependButton == "default"
          ? 'form[action="/cart/add"]'
          : null:null;

        prependButtonSelector = MBprependButton
          ? MBprependButton.id
            ? "#" + MBprependButton.id
            : MBprependButton.class
            ? "." + MBprependButton.class.replace(/\s/g, ".")
            : appendButton == "default" && prependButton == "default"
            ? 'form[action="/cart/add"]'
            : null
          : prependButton.id
          ? "#" + prependButton.id
          : prependButton.class
          ? "." + prependButton.class.replace(/\s/g, ".")
          : appendButton == "default" && prependButton == "default"
          ? 'form[action="/cart/add"]'
          : null;

      } else if (renderType === "desktop") {
        buttonID =
          page == "listing"
            ? `tryon-${psku.replace(/[^A-Za-z0-9]/g, "")}`
            : "tryonButton";

        buttonClassName = "tryonButton";
        buttonIcon = tryonButtonData && tryonButtonData.faIcon;

        buttonText = tryonButtonData && tryonButtonData.text;

        appendButtonSelector = appendButton.id
          ? "#" + appendButton.id
          : appendButton.class
          ? "." + appendButton.class.replace(/\s/g, ".")
          : appendButton == "default" && prependButton == "default"
          ? 'form[action="/cart/add"]'
          : null;

        prependButtonSelector = prependButton.id
          ? "#" + prependButton.id
          : prependButton.class
          ? "." + prependButton.class.replace(/\s/g, ".")
          : appendButton == "default" && prependButton == "default"
          ? 'form[action="/cart/add"]'
          : null;
      }

      let buttonData =
        page == "listing"
          ? {
              id: buttonID,
              companyName: company,
              dataSKU: psku,
              className: buttonClassName,
              icon: buttonIcon,
              text: buttonText,
              display: "none",
              isListingPage: true,
            }
          : {
              id: buttonID,
              dataSKU: psku,
              companyName: company,
              frameWidth: frameWidth,
              icon: tryonButtonData?.faIcon,
              text: tryonButtonData?.text,
            };

      let buttonHtml = generateButton(buttonData); //creates a button dynamically with given data
      let checkButton = document.getElementById(buttonID);
      if (appendButtonSelector) {
        //if appendButton is true in listing page
        let appendDiv = document.querySelector(appendButtonSelector);
        if (appendDiv) {
          checkButton && checkButton.remove();
          appendDiv.insertAdjacentHTML("afterend", buttonHtml);
        } else {
          console.error(appendButtonSelector, "not present in html dom");
        }
      } else if (prependButtonSelector) {
        //if prependButton is true in listing page
        let prependDiv = document.querySelector(prependButtonSelector);
        if (prependDiv) {
          checkButton && checkButton.remove();
          prependDiv.insertAdjacentHTML("beforebegin", buttonHtml);
        } else {
          console.error(prependButtonSelector, "not present in html dom");
        }
      } else {
        console.error(
          "Error: listing page only accepts only id for prependButton or appendButton"
        );
      }
      if (document.getElementById(buttonID)) {
        document
          .getElementById(buttonID)
          .setAttribute("style", "display:block");
      }
    } else {
      if (nonTryOnProductsReport) {
        //check if  nonTryOnProductsReport param is true
        skus_non_tryon.push(psku); //push not tryon skus to array
        skus_non_tryon = skus_non_tryon.filter(
          (item, index) => skus_non_tryon.indexOf(item) === index
        ); //filter duplicate not tryon skus from array
      }
    }
  }
}

function generateButton(data) {
  if (!data) {
    return "";
  }

  const {
    id = "",
    className = "",
    icon = "",
    companyName = "",
    dataSKU = "",
    text = "TRY VIRTUALLY",
    display = "",
    isListingPage = false,
    frameWidth = null
  } = data;

  const displayStyle = display ? `style="display:${display}"` : "";

  const onClick = isListingPage
    ? `onTryonClick('${dataSKU}','${companyName}');`
    : `onTryonClick('${dataSKU}', '${companyName}', '${frameWidth}');`;

  const iconTemplate = icon && icon !== "disable" && `<i class="${icon}"></i> `;

  return `
    <button 
      type="button" 
      id="${id}" 
      class="${className}" 
      ${displayStyle}
      onclick="${onClick}"
    >
      ${iconTemplate}&nbsp;${text}
    </button>
  `;
}

function Addstyles(data) {
  //adding styles to button
  let tryonbutton = data?.tryonbutton,
    iFrameID = data?.iFrameID,
    MBtryonbutton = data?.MBtryonbutton,
    MBiFrameID = data?.MBiFrameID,
    tryonbuttonHover = data?.tryonbuttonHover,
    MBtryonbuttonHover = data?.MBtryonbuttonHover;

  let defaultTryonButtonStyle = `
    width: 186px;
    height: 40px;
    background: black;
    border-radius: 25px;
    padding: 0px 10px;
    color: #ffffff;
    display: block;
    text-align: center;
    font-weight: normal;
    display: none;
    text-decoration: none;
    font-size:14px;
    border: none;
    margin-left: 0px;
    transition: 0.2s;
    cursor: pointer;`;
  let defaultIframeStyles = ` opacity:1;
      background-color: transparent;
      position:fixed;
      width:100%;               
      height:100%;                  
      top:0px;
      left:0px;
      margin-left: 0px;
      margin-top: 0px;
      z-index: 2147483647 !important;
      border: none;
      overflow:hidden;`;

  const productStyles = `<style id="tryon-product-styles">
   #tryonButton{
    display: none;
  }
  #MB_tryonButton{display: none;}

   #tryonButton{
   ${defaultTryonButtonStyle}
    ${convertToStyles(tryonbutton)}; 
  }
   
#iFrameID {
   ${defaultIframeStyles}
    ${convertToStyles(iFrameID)};
  }
  #tryonButton:hover{
   ${convertToStyles(tryonbuttonHover)};
  } 
  @media(max-width:480px){

    #iFrameID{
       ${defaultIframeStyles}
      ${convertToStyles(MBiFrameID)};
    }
    #tryonButton{
       ${defaultTryonButtonStyle}
      ${convertToStyles(tryonbutton)};
      ${convertToStyles(MBtryonbutton)};
    }

    #MB_tryonButton{
       ${defaultTryonButtonStyle}
      ${convertToStyles(tryonbutton)};
      ${convertToStyles(MBtryonbutton)};
    }
    
    #MB_tryonButton:hover{
      ${convertToStyles(tryonbuttonHover)};
      ${convertToStyles(MBtryonbuttonHover)};
    
  }
}
  </styles>
  `;

  const listingStyles = ` <style id="tryon-listing-styles">  
  #tryonButton{
    display: none;
  }
  #MB_tryonButton{display: none;}
  
  
    
     .tryonButton{
   ${defaultTryonButtonStyle}
    ${convertToStyles(tryonbutton)}; 
  }

  #iFrameID {
   ${defaultIframeStyles}
    ${convertToStyles(iFrameID)};
  }
.tryonButton:hover{
   ${convertToStyles(tryonbuttonHover)};
  } 

  
  @media(max-width:480px){

    #iFrameID{
       ${defaultIframeStyles}
      ${convertToStyles(MBiFrameID)};
    }
    
     .tryonButton{
       ${defaultTryonButtonStyle}
      ${convertToStyles(tryonbutton)};
      ${convertToStyles(MBtryonbutton)};
    }

    .MB_tryonButton{
       ${defaultTryonButtonStyle}
      ${convertToStyles(tryonbutton)};
      ${convertToStyles(MBtryonbutton)};
    }

      .MB_tryonButton:hover{
      ${convertToStyles(tryonbuttonHover)};
      ${convertToStyles(MBtryonbuttonHover)};
  }
}
</style>`;

  if (
    !document.querySelector("#tryon-listing-styles") &&
    pageData == "listing"
  ) {
    document
      .querySelector("head")
      .insertAdjacentHTML("afterbegin", listingStyles);
  }
  if (
    !document.querySelector("#tryon-product-styles") &&
    pageData == "product"
  ) {
    document
      .querySelector("head")
      .insertAdjacentHTML("afterbegin", productStyles);
  }
}

function convertToStyles(data) {
  //convertToStyles is a fun which converts styles passed from api to css code

  if (data && data.fontFamily) {
    data.fontFamily = data.fontFamily ? data.fontFamily.toLowerCase() : ""; //convert fonfamily to lowercase to apply
  }
  return data
    ? JSON.stringify(data)
        .replace(/[{}"']/g, "")
        .replace(/,/g, ";")
        .replace(/[A-Z]/g, (s) => "-" + s.toLowerCase())
    : "";
}

function addAnalyticsSnippets() {
  let scriptTag = document.createElement('script');

  let scriptContent = `
    (function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':
    new Date().getTime(),event:'gtm.js'});var f=d.getElementsByTagName(s)[0],
    j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;j.src=
    'https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
    })(window,document,'script','dataLayer','GTM-P9FG4SV');`;

  scriptTag.text = scriptContent;

  document.head.appendChild(scriptTag);


  let noScriptTag = document.createElement('noscript');

  noScriptTag.innerHTML = '<iframe src="https://www.googletagmanager.com/ns.html?id=GTM-P9FG4SV" height="0" width="0"></iframe>';   

  document.body.append(noScriptTag);
}

function trimString(stringInput, maxLength = 50) {
  if (typeof stringInput != "undefined") {
    let skusArray = stringInput.split(",");
    if (skusArray.length > maxLength) {
      skusArray = skusArray.splice(0, maxLength);
    }
    return skusArray.join(",");
  } else {
    return "";
  }
}

function addTryOnIframe(){
  if (!document.querySelector("#iFrameID")) {
    document.querySelector("body").insertAdjacentHTML(
      "afterend",
      '<iframe id="iFrameID" allow="camera *; web-share;" src="about:blank" style="display:none;"></iframe>'
    );
  }
}

function removeTryOnIframe(){
  //to solve back button issues 
  let iframeEl = document.getElementById("iFrameID");
  iframeEl.parentNode.removeChild(iframeEl);
}


//function to track purchases happening after try on
async function triggerPurchaseEventTryOn(data) {
  if (!document.querySelector("#iFrameID")) {
      addAnalyticsSnippets(); 
  }
  let psku = data?.psku ? data.psku : null;
  let company_name = data?.company ? data.company : null;
  
  window.dataLayer = window.dataLayer || [];
    dataLayer.push({
      'event': 'purchase',
      'userID': company_name,
      'sku': psku
    });
}

function checkSkuLocation(tryonSkusJson, psku) {
  try {
    
    // Find which arrays contain the SKU
    const result = [];
    for (const [key, value] of Object.entries(tryonSkusJson)) {
      if (value.includes(psku)) {
        result.push(key);
      }
    }

    // Display results
    if (result.length) {
      console.log(`SKU ${psku} found in:`, result);
      return result;
    } else {
    // console.log(`SKU ${psku} not found in any category`);
      return result;
    }
  } catch (error) {
    console.error('Error fetching JSON data:', error);
  }
}

