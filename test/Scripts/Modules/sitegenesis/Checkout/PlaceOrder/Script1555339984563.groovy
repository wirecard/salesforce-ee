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

WebUI.waitForElementClickable(findTestObject('sitegenesis/checkout/billing/Button place order'), 5)

if ('PG_SEPA' == paymentMethodId) {
	WebUI.check(findTestObject('checkout/summary/Mandate Accept'))
}

WebUI.click(findTestObject('sitegenesis/checkout/billing/Button place order'))

switch (paymentMethodId) {
	case 'PG_GIROPAY':
		WebUI.callTestCase(findTestCase('Modules/Payment methods/Giropay'), [:], FailureHandling.STOP_ON_FAILURE)

		break
    case 'PG_PAYPAL':
        WebUI.callTestCase(findTestCase('Modules/Payment methods/PayPal'), [:], FailureHandling.STOP_ON_FAILURE)

        break
    case 'PG_SOFORT':
        WebUI.callTestCase(findTestCase('Modules/Payment methods/Sofort'), [:], FailureHandling.STOP_ON_FAILURE)

        break
	case 'PG_CREDITCARD':
		WebUI.callTestCase(findTestCase('Modules/Payment methods/Creditcard embedded/Creditcard'), [:], FailureHandling.STOP_ON_FAILURE)

		break
    default:
        break
}

WebUI.waitForElementPresent(findTestObject('sitegenesis/checkout/Order success(orderNo)'), 20)

WebUI.verifyElementPresent(findTestObject('sitegenesis/checkout/Order success(orderNo)'), 3)

