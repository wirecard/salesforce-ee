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

//WebUI.waitForElementClickable(findTestObject('sfra/checkout/Link proceed to order overview'), 2)
WebUI.delay(5)

if ('PG_SEPA' == paymentMethodId) {
	WebUI.check(findTestObject('checkout/summary/Mandate Accept'))
}

WebUI.waitForElementClickable(findTestObject('sfra/checkout/Link place order'), 5)

WebUI.click(findTestObject('sfra/checkout/Link place order'))

switch (paymentMethodId) {
	case 'PG_EPS':
		WebUI.callTestCase(findTestCase('Modules/Payment methods/Eps'), [:], FailureHandling.STOP_ON_FAILURE)
	
		break
	case 'PG_GIROPAY':
		WebUI.callTestCase(findTestCase('Modules/Payment methods/Giropay'), [:], FailureHandling.STOP_ON_FAILURE)

		break
    case 'PG_PAYPAL':
        WebUI.callTestCase(findTestCase('Modules/Payment methods/PayPal'), [:], FailureHandling.STOP_ON_FAILURE)

        break
    case 'PG_SOFORT':
        WebUI.callTestCase(findTestCase('Modules/Payment methods/Sofort'), [:], FailureHandling.STOP_ON_FAILURE)

        break
    default:
        break
}

WebUI.waitForElementPresent(findTestObject('sfra/checkout/Order success message'), 60)

WebUI.verifyElementPresent(findTestObject('sfra/checkout/Order success message'), 5)

