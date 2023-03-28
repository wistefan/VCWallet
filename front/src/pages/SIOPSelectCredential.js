import { log } from '../log'
import { Base64 } from 'js-base64';

// import * as db from "../components/db"
// import * as jwt from "../components/jwt"

let gotoPage = window.MHR.gotoPage
let goHome = window.MHR.goHome

window.MHR.register("SIOPSelectCredential", class SIOPSelectCredential extends window.MHR.AbstractPage {

    constructor(id) {
        super(id)
    }

    async enter(qrData) {
        let html = this.html

        console.log("Inside SIOPSelectCredential:", qrData)
        if (qrData == null) {
            qrData = "No data received"
        }

        qrData = qrData.replace("openid://?", "")
        var params = new URLSearchParams(qrData)
        var redirect_uri = params.get("redirect_uri")
        var state = params.get("state")
        console.log("state", state, "redirect_uri", redirect_uri)

        // Check if we have a certificate in local storage
        let qrContent = window.localStorage.getItem("W3C_VC_LD")
        if (!qrContent) {
            let theHtml = html`
            <div class="w3-panel w3-margin w3-card w3-center w3-round color-error">
            <p>You do not have a Verifiable Credential.</p>
            <p>Please go to an Issuer to obtain one.</p>
            </div>
            `;
            this.render(theHtml)
            return             
        }

        console.log("credential", qrContent)

        let theHtml = html`
            <p></p>
            <div class="w3-row">

                <div class="w3-half w3-container w3-margin-bottom">
                    <div class="w3-card-4">
                        <div class=" w3-container w3-margin-bottom color-primary">
                            <h4>Authorization Request received</h4>
                        </div>

                        <div class=" w3-container">
                        <p>
                            The Verifier has requested a Verifiable Credential to perform authentication.
                        </p>
                        <p>
                            If you want to send the credential, click the button "Send Credential".
                        </p>
                        </div>
            
                        <div class="w3-container w3-padding-16">
                            <btn-primary @click=${()=> sendCredential(redirect_uri, qrContent, state)}>${T("Send Credential")}</btn-primary>
                        </div>
            
                    </div>
                </div>            
            </div>
        `

        this.render(theHtml)

    }

})

async function sendCredential(backEndpoint, credential, state) {

    console.log("sending POST to:", backEndpoint + "?state=" + state)
    var ps = {
        id: "Placeholder - not yet evaluated.",
        definition_id: "Example definition." 
    }
    var vpToken = {
        context: ["https://www.w3.org/2018/credentials/v1"],
        type: ["VerifiablePresentation"],
        verifiableCredential: [
            JSON.parse(credential)
        ],
        // currently unverified
        holder: "did:my:wallet"
    }
    console.log("The encoded credential " +Base64.encodeURI(JSON.stringify(vpToken)))

    var formAttributes = {
        'vp_token': Base64.encodeURI(JSON.stringify(vpToken)),
        'presentation_submission': Base64.encodeURI(JSON.stringify(ps))
    }
    var formBody = [];
    for (var property in formAttributes) {
    var encodedKey = encodeURIComponent(property);
    var encodedValue = encodeURIComponent(formAttributes[property]);
    formBody.push(encodedKey + "=" + encodedValue);
    }
    formBody = formBody.join("&");
    console.log("The body: " + formBody)
    try {
        let response = await fetch(backEndpoint + "?state=" + state, {
            method: "POST",
            mode: "cors",
            cache: "no-cache",
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: formBody,
        })
        if (response.ok) {
            var result = await response.text()
        } else {
            if (response.status == 403) {
                alert.apply("error 403")
                window.MHR.goHome()
                return "Error 403"
            }
            var error = await response.text()
            log.error(error)
            alert(error)
            window.MHR.goHome()
            return null
        }
    } catch (error) {
        log.error(error)
        alert(error)
        return null
    }

    console.log(result)
    gotoPage("MessagePage", {
        title: "Credential sent",
        msg: "The credential has been sent to the Verifier"
    })
    return

}
