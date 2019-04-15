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

WebUI.setText(findTestObject('sitegenesis/checkout/shipping/Shipping firstname'), firstName)

WebUI.setText(findTestObject('sitegenesis/checkout/shipping/Shipping lastname'), lastName)

WebUI.setText(findTestObject('sitegenesis/checkout/shipping/Shipping address1'), address1)

WebUI.setText(findTestObject('sitegenesis/checkout/shipping/Shipping city'), city)

WebUI.setText(findTestObject('sitegenesis/checkout/shipping/Shipping zipCode'), zipCode)

WebUI.selectOptionByValue(findTestObject('sitegenesis/checkout/shipping/Shipping country'), country, false)

WebUI.selectOptionByValue(findTestObject('sitegenesis/checkout/shipping/Shipping state'), state, false)

WebUI.setText(findTestObject('sitegenesis/checkout/shipping/Shipping phone'), phone)

if (useShippingAsBilling == 'true') {
    WebUI.check(findTestObject('sitegenesis/checkout/shipping/Shipping use-as-billing'), FailureHandling.STOP_ON_FAILURE)
}

