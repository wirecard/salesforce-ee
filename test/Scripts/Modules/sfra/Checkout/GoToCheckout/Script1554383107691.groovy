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

WebUI.delay(3)

WebUI.waitForElementClickable(findTestObject('sfra/checkout/Minicart link'), 5)

WebUI.click(findTestObject('sfra/checkout/Minicart link'))

WebUI.delay(5)

switch (paymentMethodId) {
    case 'PG_PAYOLUTION_INVOICE':
        WebUI.waitForElementVisible(findTestObject('sfra/checkout/cart/Select quantity'), 2)

        WebUI.selectOptionByIndex(findTestObject('sfra/checkout/cart/Select quantity'), 2, FailureHandling.STOP_ON_FAILURE)

        WebUI.delay(2)

        break
    default:
        break
}

WebUI.waitForElementClickable(findTestObject('sfra/checkout/Link checkout'), 30)

WebUI.click(findTestObject('sfra/checkout/Link checkout'))

