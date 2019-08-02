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

WebUI.waitForElementClickable(findTestObject('sfra/checkout/payment/Select payolution invoice'), 10)

WebUI.click(findTestObject('sfra/checkout/payment/Select payolution invoice'))

WebUI.waitForElementVisible(findTestObject('sfra/checkout/payment/payolution invoice/Select dob year'), 10)

WebUI.verifyOptionPresentByValue(findTestObject('sfra/checkout/payment/payolution invoice/Select dob year'), '1990', false, 10, FailureHandling.STOP_ON_FAILURE)

WebUI.selectOptionByValue(findTestObject('sfra/checkout/payment/payolution invoice/Select dob year'), '1990', false)

WebUI.verifyOptionPresentByValue(findTestObject('sfra/checkout/payment/payolution invoice/Select dob month'), '10', false, 10, FailureHandling.STOP_ON_FAILURE)

WebUI.selectOptionByValue(findTestObject('sfra/checkout/payment/payolution invoice/Select dob month'), '10', false)

WebUI.verifyOptionPresentByValue(findTestObject('sfra/checkout/payment/payolution invoice/Select dob day'), '20', false, 10, FailureHandling.STOP_ON_FAILURE)

WebUI.selectOptionByValue(findTestObject('sfra/checkout/payment/payolution invoice/Select dob day'), '20', false)

WebUI.check(findTestObject('sfra/checkout/payment/payolution invoice/Checkbox consent'))

