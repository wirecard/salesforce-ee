import static com.kms.katalon.core.checkpoint.CheckpointFactory.findCheckpoint
import static com.kms.katalon.core.testcase.TestCaseFactory.findTestCase
import static com.kms.katalon.core.testdata.TestDataFactory.findTestData
import static com.kms.katalon.core.testobject.ObjectRepository.findTestObject
import com.kms.katalon.core.checkpoint.Checkpoint as Checkpoint
import com.kms.katalon.core.cucumber.keyword.CucumberBuiltinKeywords as CucumberKW
import com.kms.katalon.core.mobile.keyword.MobileBuiltInKeywords as Mobile
import com.kms.katalon.core.model.FailureHandling as FailureHandling
import com.kms.katalon.core.testcase.TestCase as TestCase
import com.kms.katalon.core.testdata.TestData as TestData
import com.kms.katalon.core.testobject.TestObject as TestObject
import com.kms.katalon.core.webservice.keyword.WSBuiltInKeywords as WS
import com.kms.katalon.core.webui.keyword.WebUiBuiltInKeywords as WebUI
import internal.GlobalVariable as GlobalVariable

WebUI.callTestCase(findTestCase('Modules/sfra/Open browser'), [('relativeURLHomepage') : relativeURLHomepage], FailureHandling.STOP_ON_FAILURE)

WebUI.callTestCase(findTestCase('Modules/sfra/Accept consent tracking'), [:], FailureHandling.STOP_ON_FAILURE)

WebUI.callTestCase(findTestCase('Modules/sfra/Products/AddToCart-Product1'), [:], FailureHandling.STOP_ON_FAILURE)

WebUI.callTestCase(findTestCase('Modules/sfra/Checkout/GoToCheckout'), [:], FailureHandling.STOP_ON_FAILURE)

if (login == 'false') {
    WebUI.callTestCase(findTestCase('Modules/sfra/Checkout/CheckoutGuest'), [:], FailureHandling.STOP_ON_FAILURE)

    WebUI.callTestCase(findTestCase('Modules/sfra/Checkout/ShippingAddress'), [('firstName') : firstName, ('lastName') : lastName
            , ('address1') : address1, ('zipCode') : zipCode, ('city') : city, ('state') : state, ('country') : country, ('email') : email
            , ('phone') : phone], FailureHandling.STOP_ON_FAILURE)
} else {
    WebUI.callTestCase(findTestCase('Modules/sfra/Checkout/CheckoutLogin'), [('email') : email, ('password') : password], 
        FailureHandling.STOP_ON_FAILURE)
}

WebUI.callTestCase(findTestCase('Modules/sfra/Checkout/PaymentSelect'), [('paymentMethodId') : paymentMethodId], FailureHandling.STOP_ON_FAILURE)

WebUI.callTestCase(findTestCase('Modules/sfra/Checkout/PlaceOrder'), [('paymentMethodId') : paymentMethodId], FailureHandling.STOP_ON_FAILURE)

