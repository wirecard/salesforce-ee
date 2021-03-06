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

WebUI.waitForElementClickable(findTestObject('sfra/checkout/payment/SepaDD'), 10)

WebUI.click(findTestObject('sfra/checkout/payment/SepaDD'))

WebUI.setText(findTestObject('sfra/checkout/payment/Sepa/Debtor'), findTestData('sepa_direct_debit').getValue(1, 1))

WebUI.setText(findTestObject('sfra/checkout/payment/Sepa/Iban'), findTestData('sepa_direct_debit').getValue(2, 1))

if (WebUI.verifyElementPresent(findTestObject('sfra/checkout/payment/Sepa/Bic'), 1, FailureHandling.OPTIONAL)) {
    WebUI.setText(findTestObject('sfra/checkout/payment/Sepa/Bic'), findTestData('sepa_direct_debit').getValue(3, 1))
}



