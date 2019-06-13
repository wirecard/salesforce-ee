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

switch (paymentMethodId) {
	case 'PG_EPS':
		WebUI.callTestCase(findTestCase('Modules/sitegenesis/Checkout/PaymentMethods/Eps'), [:], FailureHandling.STOP_ON_FAILURE)
	
		break
	case 'PG_GIROPAY':
		WebUI.callTestCase(findTestCase('Modules/sitegenesis/Checkout/PaymentMethods/Giropay'), [:], FailureHandling.STOP_ON_FAILURE)

		break
    case 'PG_PAYPAL':
        WebUI.callTestCase(findTestCase('Modules/sitegenesis/Checkout/PaymentMethods/PayPal'), [:], FailureHandling.STOP_ON_FAILURE)

        break
    case 'PG_SOFORT':
        WebUI.callTestCase(findTestCase('Modules/sitegenesis/Checkout/PaymentMethods/Sofort'), [:], FailureHandling.STOP_ON_FAILURE)

        break
    case 'PG_CREDITCARD':
        WebUI.callTestCase(findTestCase('Modules/sitegenesis/Checkout/PaymentMethods/Creditcard'), [:], FailureHandling.STOP_ON_FAILURE)

        break
    default:
        break
}

WebUI.waitForElementClickable(findTestObject('sitegenesis/checkout/link proceed to order overview'), 5)

WebUI.click(findTestObject('sitegenesis/checkout/link proceed to order overview'))

