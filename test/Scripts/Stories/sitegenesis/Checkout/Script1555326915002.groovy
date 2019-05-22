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

WebUI.callTestCase(findTestCase('Modules/sitegenesis/Open browser'), [('relativeURLHomepage') : relativeURLHomepage], FailureHandling.STOP_ON_FAILURE)

WebUI.callTestCase(findTestCase('Modules/sitegenesis/Products/AddToCart-Product1'), [('productId') : findTestData('product_testdata').getValue(
            1, 1), ('quantity') : findTestData('product_testdata').getValue(2, 1), ('color') : findTestData('product_testdata').getValue(
            3, 1)], FailureHandling.STOP_ON_FAILURE)

WebUI.callTestCase(findTestCase('Modules/sitegenesis/Checkout/GoToCheckout'), [:], FailureHandling.STOP_ON_FAILURE)

if (login == 'false') {
    WebUI.callTestCase(findTestCase('Modules/sitegenesis/Checkout/CheckoutGuest'), [:], FailureHandling.STOP_ON_FAILURE)

    WebUI.callTestCase(findTestCase('Modules/sitegenesis/Checkout/ShippingAddress'), [('firstName') : firstName, ('lastName') : lastName
            , ('address1') : address1, ('city') : city, ('zipCode') : zipCode, ('state') : state, ('country') : country, ('phone') : phone
            , ('useShippingAsBilling') : useShippingAsBilling], FailureHandling.STOP_ON_FAILURE)
} else {
    WebUI.callTestCase(findTestCase('Modules/sitegenesis/Checkout/CheckoutLogin'), [('email') : email, ('password') : password
            , ('useShippingAsBilling') : useShippingAsBilling], FailureHandling.STOP_ON_FAILURE)
}

WebUI.callTestCase(findTestCase('Modules/sitegenesis/Checkout/SelectShipping'), [:], FailureHandling.STOP_ON_FAILURE)

WebUI.callTestCase(findTestCase('Modules/sitegenesis/Checkout/Billing/Set email address'), [('email') : email, ('login') : login], 
    FailureHandling.STOP_ON_FAILURE)

WebUI.callTestCase(findTestCase('Modules/sitegenesis/Checkout/PaymentSelect'), [('paymentMethodId') : paymentMethodId], 
    FailureHandling.STOP_ON_FAILURE)

WebUI.callTestCase(findTestCase('Modules/sitegenesis/Checkout/PlaceOrder'), [('paymentMethodId') : paymentMethodId], FailureHandling.STOP_ON_FAILURE)

